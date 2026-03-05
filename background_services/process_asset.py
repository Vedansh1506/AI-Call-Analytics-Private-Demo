from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from background_services.gemini import gemini_analysis, translate_utterances_to_english
from background_services.normalization import normalize_speakers
from background_services.performance_metrics import calc_performance
from background_services.transcription import transcribe_audio
from models.model import ApiResponses, AssetFile
from utils.config import SUPPORTED_LANGUAGES
from utils.database import SessionLocal
from utils.logger import get_logger

PROCESSING_STALE_AFTER_MINUTES = 15

logger = get_logger(__name__)

def process_asset(asset_id: int):
    """
    Background task that processes uploaded audio.
    """
    db: Session = SessionLocal()
    asset = None

    try:
        asset = db.query(AssetFile).filter(AssetFile.id == asset_id).first()
        if not asset:
            logger.error(f"Asset not found: {asset_id}")
            return

        if asset.status == "completed":
            logger.info(f"[asset_id={asset_id}] already completed; skipping")
            return

        if asset.status == "processing" and asset.started_at:
            now = datetime.now(timezone.utc)
            age = now - asset.started_at
            if age < timedelta(minutes=PROCESSING_STALE_AFTER_MINUTES):
                logger.info(f"[asset_id={asset_id}] already processing (age={age}); skipping duplicate task")
                return
            logger.warning(f"[asset_id={asset_id}] stale processing detected (age={age}); retrying task")


        logger.info(f"[asset_id={asset_id}] Processing started")
        process_start_time = datetime.now(timezone.utc)

        asset.status = "processing"
        asset.started_at = datetime.now(timezone.utc)
        asset.processing_stage = "transcription"

        db.commit()

        # ---------- TRANSCRIPTION ----------
        transcription_start = datetime.now(timezone.utc)
        transcription = transcribe_audio(asset.filepath)
        transcription_end = datetime.now(timezone.utc)

        detected_lang_code = transcription.get("language_code") or "unknown"
        detected_lang_name = SUPPORTED_LANGUAGES.get(detected_lang_code, "Unknown")
        if detected_lang_code != "unknown" and detected_lang_code not in SUPPORTED_LANGUAGES:
            asset.status = "failed"
            asset.processing_stage = "transcription"
            asset.error_reason = f"Unsupported language: {detected_lang_code}"
            asset.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        asset.language = detected_lang_name
        asset.processing_stage = "analysis"
        db.commit()

        speaker_transcript = "\n".join(
            f"{u['speaker']}: {u['text']}"
            for u in transcription.get("utterances", [])
            if u.get("text")
        )

        try:
        # ---------- GEMINI ----------
            analysis_start = datetime.now(timezone.utc)
            gemini_response = gemini_analysis(
                transcript_text=speaker_transcript,
                utterances=transcription["utterances"],
                lang="en",
            )


            analysis = gemini_response["analysis"]
            llm_usage = gemini_response["llm_usage"]
            

            call_details = analysis.get("CallDetails", {})
            if "OverallSentiment" not in call_details and "Sentiment" in call_details:
                call_details["OverallSentiment"] = call_details.get("Sentiment")
            call_details.pop("Sentiment", None)
            sentence_sentiment = analysis.get("SentenceSentiment", [])
            participants = call_details.get("Participants", [])

        except RuntimeError as e:
            logger.error(f"[asset_id={asset_id}] Gemini analysis failed")

            db.rollback()
            asset.status = "failed"
            asset.processing_stage = "analysis"
            asset.error_reason = f"{type(e).__name__}: {str(e)}"
            asset.completed_at = datetime.now(timezone.utc)
            db.commit()

            msg = str(e).lower()
            transient_markers = ["timeout", "temporar", "rate limit", "503", "connection", "unavailable"]
            if any(m in msg for m in transient_markers):
                logger.warning(f"[asset_id={asset_id}] transient Gemini error treated as failure (no auto-retry configured)")
            return


        # ---------- NORMALIZATION ----------
        normalized_utterances = normalize_speakers(
            transcription["utterances"],
            participants
        )

        normalized_transcript = {
            "utterances": normalized_utterances,  # backward compatibility
            "variants": {
                "original": {
                    "language": detected_lang_code,
                    "utterances": normalized_utterances,
                }
            },
        }

        if detected_lang_code != "en":
            try:

                translated = translate_utterances_to_english(transcription["utterances"])
                normalized_translated = normalize_speakers(translated, participants)
                normalized_transcript["variants"]["en"] = {
                    "language": "en",
                    "utterances": normalized_translated,
                }
            except Exception:
                logger.exception(f"[asset_id={asset_id}] English transcript translation failed; continuing with original only")

        duration_sec = int(transcription.get("audio_duration_seconds") or 0)

        performance_metrics = calc_performance(
            utterances=normalized_utterances,
            audio_start_ms=0,
            audio_end_ms=duration_sec * 1000
        )

        analysis_end = datetime.now(timezone.utc)
        
        asset.call_length = duration_sec
        asset.status = "completed"
        asset.processing_stage = "completed"
        asset.completed_at = datetime.now(timezone.utc)

        total_processing_time = (datetime.now(timezone.utc) - process_start_time).total_seconds()
        transcription_time = (transcription_end - transcription_start).total_seconds()
        analysis_time = (analysis_end - analysis_start).total_seconds()

        master_json = {
            "asset_id": asset.id,
            "filename": asset.filename,
            "language": asset.language,
            "call_length_seconds": duration_sec,
            "status": asset.status,
            "processing_metrics": {
                "total_processing_time_sec": total_processing_time,
                "transcription_time_sec": transcription_time,
                "analysis_time_sec": analysis_time
            },
            "conversation_insights": call_details,
            "sentence_sentiment": sentence_sentiment,
            "performance_metrics": performance_metrics,
            "usage": {
                "transcription": {
                    "provider": "assemblyai",
                    "duration_seconds": duration_sec
                },
            "llm": llm_usage
            },
        }

        existing_response = db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset.id).first()
        if existing_response:
            logger.info(f"[asset_id={asset_id}] response already exists; marking completed and skipping insert")
            asset.call_length = duration_sec
            asset.status = "completed"
            asset.processing_stage = "completed"
            asset.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        # ---------- SAVE API RESPONSE ----------
        api_response = ApiResponses(
            asset_file_id=asset.id,
            transcript_raw={"text": transcription["text"]},
            assemblyai_raw=transcription,
            gemini_raw=analysis,
            transcription_usage={
                "provider": "assemblyai",
                "duration_seconds": duration_sec
            },
            llm_usage=llm_usage,
            normalized_transcript=normalized_transcript,
            normalized_insights=call_details,
            sentence_sentiment=sentence_sentiment,
            performance_metrics=performance_metrics,
            master_json=master_json,
            analysis_translations={},
        )

        db.add(api_response)
        db.commit()


        logger.info(f"[asset_id={asset_id}] Processing completed successfully")

    except Exception as e:
        logger.exception(f"[asset_id={asset_id}] Processing failed")
        db.rollback()

        if asset is not None:
            try:
                asset.status = "failed"
                asset.processing_stage = asset.processing_stage or "unknown"
                asset.error_reason = f"{type(e).__name__}: {str(e)}"
                asset.completed_at = datetime.now(timezone.utc)
                db.commit()
            except Exception:
                db.rollback()
                logger.exception(f"[asset_id={asset_id}] Failed to persist failure state")
        
        return

    finally:
        db.close()
