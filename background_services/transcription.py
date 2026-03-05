import time
from pathlib import Path
import assemblyai as aai
from aksharamukha.transliterate import process
from utils.config import settings

aai.settings.api_key = settings.ASSEMBLYAI_API_KEY

def transcribe_audio(audio_file_path: str) -> dict:
    """
    Uploads an audio file to AssemblyAI for transcription and intelligence analysis.

    Features enabled:
    - Speaker Diarization (identifies who is speaking)
    - Sentiment Analysis (Positive/Neutral/Negative)
    - PII Redaction (Removes sensitive data)
    - Language Detection (Automatically detects source language)

    Args:
        audio_file_path (str): The local path to the audio file (mp3, wav, etc.).

    Returns:
        dict: A dictionary containing:
            - 'text': The full raw transcript.
            - 'utterances': List of speech segments with speaker labels.
            - 'sentiment_timeline': Sentence-by-sentence sentiment data.
            - 'audio_duration_seconds': Length of the audio.
            - 'status': Final status of the job (should be 'completed').
    
    Raises:
        FileNotFoundError: If the audio file does not exist.
        RuntimeError: If AssemblyAI returns an error status.
    """

    audio_path = Path(audio_file_path)

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

    config = aai.TranscriptionConfig(
        speaker_labels=True,
        language_detection=True,
        sentiment_analysis=True,
        redact_pii=True,
        redact_pii_policies=[
            aai.PIIRedactionPolicy.banking_information,
            aai.PIIRedactionPolicy.credit_card_number,
            aai.PIIRedactionPolicy.credit_card_expiration,
            aai.PIIRedactionPolicy.credit_card_cvv,
            aai.PIIRedactionPolicy.email_address,
            aai.PIIRedactionPolicy.passport_number,
            aai.PIIRedactionPolicy.password,
            aai.PIIRedactionPolicy.phone_number,
            aai.PIIRedactionPolicy.us_social_security_number,
        ],
        redact_pii_sub="entity_name",
    )
    
    transcriber = aai.Transcriber()

    max_retries = 2
    retry_delay = 5

    for attempt in range(max_retries + 1):
        try:
            transcript = transcriber.transcribe(str(audio_path), config=config)

            if transcript.status == aai.TranscriptStatus.error:
                raise RuntimeError(f"AssemblyAI error: {transcript.error}")

            break  # success

        except Exception as e:
            if attempt == max_retries:
                raise RuntimeError(f"Transcription failed after retries: {str(e)}")
            
            time.sleep(retry_delay)

    language_code = "unknown"
    if hasattr(transcript, "json_response"):
        language_code = transcript.json_response.get("language_code") or "unknown"

    speaker_map = {}
    speaker_counter = 0

    def normalize_speaker_format(speaker):
        nonlocal speaker_counter
        if speaker not in speaker_map:
            speaker_map[speaker] = f"speaker_{speaker_counter}"
            speaker_counter += 1
        return speaker_map[speaker]
    
    
    finaltext = transcript.text
    if language_code=="gu":
        finaltext=process("Devanagari","Gujarati", finaltext)

    utterances = []
    for u in transcript.utterances or []:
        utter_text = u.text
        if language_code == "gu":
            utter_text = process("Devanagari", "Gujarati", utter_text)

        utterances.append({
            "speaker": normalize_speaker_format(u.speaker),
            "start": u.start,
            "end": u.end,
            "text": utter_text,
        })

    #changes
    sentiment_timeline = []
    raw_sentiment = (
        transcript.sentiment_analysis_results
        if hasattr(transcript, "sentiment_analysis_results")
        else None
    )

    for s in raw_sentiment or []:
        sentiment_timeline.append({
            "start": s.start,
            "end": s.end,
            "sentiment": s.sentiment,
            "confidence": s.confidence,
            "text": s.text,
            "speaker": normalize_speaker_format(s.speaker),
        })

    return {
        "text": finaltext,
        "utterances": utterances,
        "sentiment_timeline": sentiment_timeline,
        "audio_duration_seconds": transcript.audio_duration,
        "confidence": transcript.confidence,
        "language_code": language_code,
        "status": transcript.status,
    }
