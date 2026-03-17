import io
import mimetypes
import os
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import filetype
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from rapidfuzz import fuzz
from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session

from background_services.process_asset import process_asset
from models.model import ApiResponses, AssetFile
from routers.auth import _require_csrf, get_current_user
from routers.functions import _analysis_pdf, _select_insights_view, _transcript_pdf
from utils.config import SUPPORTED_LANGUAGES
from utils.database import get_db
from utils.logger import get_logger

# from background_services.tasks import process_asset_task

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_FILES_PER_REQUEST = 10
ALLOWED_MIME_TYPES = {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg","audio/mp4", "audio/webm", "video/mp4", "video/webm",}
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"}

logger = get_logger(__name__)

UPLOAD_DIR = "uploads/audio"

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_audio(
    file: list[UploadFile] = File(...),
    language: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    csrf_ok: None = Depends(_require_csrf),
    background_tasks: BackgroundTasks = None
):
    if not file:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    if len(file) > MAX_FILES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_REQUEST} files per upload")

    request_id = str(uuid.uuid4())[:8]

    logger.info(f"[request_id={request_id}] Upload request received")  

    asset_ids = []

    
    for x in file:
        
        header = await x.read(261)
        await x.seek(0)

        kind = filetype.guess(header)
        detected_mime = kind.mime if kind else None
        ext = os.path.splitext(x.filename)[1].lower()

        if detected_mime not in ALLOWED_MIME_TYPES:
            if not (
                ext in ALLOWED_EXTENSIONS and
                x.content_type in ALLOWED_MIME_TYPES.union({"audio/mp3", "application/octet-stream"})
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported audio format for file: {x.filename}",
                )


        # Validate file type
        logger.info(f"[request_id={request_id}] Received file: {x.filename}, content_type={x.content_type}")

        # Create unique filename
        file_ext = os.path.splitext(x.filename)[1]
        unique_name = f"{uuid.uuid4()}{file_ext}"
        save_path = os.path.join(UPLOAD_DIR, unique_name)

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Save file locally
        logger.info(f"[request_id={request_id}] Saving file to disk: {save_path}")

        x.file.seek(0, 2)  # move cursor to end
        file_size = x.file.tell()
        x.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Max allowed size is 100 MB"
            )

        # Save file locally
        with open(save_path, "wb") as buffer:
            while chunk := x.file.read(1024 * 1024):
                buffer.write(chunk)


    # Save metadata in DB
        asset = AssetFile(
            filename=x.filename,
            filepath=save_path,
            language=language or "unknown",
            call_length=0,
            user_auth_id=current_user.id,
            status="uploaded",
            analysis_output_mode="english",
            transcript_mode="bilingual",
            target_language="en",
        )

        try:
            db.add(asset)
            db.commit()
            db.refresh(asset)
        except Exception:
            db.rollback()
            raise

        logger.info(f"[request_id={request_id}] Asset created with id={asset.id}")

        try: 
            # process_asset_task.delay(asset.id)
            # process_asset(asset.id)
            background_tasks.add_task(process_asset, asset.id)
        except Exception as e:
            try:
                asset.status = "failed"
                asset.processing_stage = "queue_error"
                asset.error_reason = f"Queue enqueue failed: {type(e).__name__}"
                db.commit()
            except Exception:
                db.rollback()
            raise HTTPException(status_code=503, detail="Processing queue unavailable")
        
        asset_ids.append(asset.id)

    return {
        "success": True,
        "asset_file_id": asset_ids,
        "files_uploaded": len(asset_ids),
        "status": "processing"
    }

@router.get("/upload-constraints", status_code=status.HTTP_200_OK)
def get_upload_constraints():
    return {
        "max_files_per_request": MAX_FILES_PER_REQUEST,
        "max_file_size_bytes": MAX_FILE_SIZE,
        "max_file_size_mb": round(MAX_FILE_SIZE / (1024 * 1024), 2),
        "allowed_mime_types": sorted(list(ALLOWED_MIME_TYPES)),
        "allowed_extensions": sorted(list(ALLOWED_EXTENSIONS)),
    }

@router.get("/supported-languages")
def get_supported_languages():
    return{
        "supported_languages": SUPPORTED_LANGUAGES
    }

@router.get("/batch/status", status_code=status.HTTP_200_OK)
def get_batch_status(
    asset_ids: list[int] = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assets = (
        db.query(AssetFile)
        .filter(
            AssetFile.id.in_(asset_ids),
            AssetFile.user_auth_id == current_user.id
        )
        .all()
    )

    if not assets:
        raise HTTPException(status_code=404, detail="No assets found")

    summary = {
        "total": len(assets),
        "uploaded": 0,
        "processing": 0,
        "completed": 0,
        "failed": 0
    }

    details = []

    for asset in assets:
        if asset.status in summary:
            summary[asset.status] += 1

        details.append({
            "asset_id": asset.id,
            "filename": asset.filename,
            "status": asset.status
        })

    return {
        "summary": summary,
        "assets": details
    }

@router.get("/stats", status_code=status.HTTP_200_OK)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Total calls
    total_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id
    ).scalar()

    # Completed calls
    completed_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "completed"
    ).scalar()

    # Failed calls
    failed_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "failed"
    ).scalar()

    # Recent Calls
    recent_calls = db.query(AssetFile).filter(
        AssetFile.user_auth_id == current_user.id
    ).order_by(
        AssetFile.created_date_time.desc()
    ).limit(5).all()

    # Average call duration
    avg_duration = db.query(func.avg(AssetFile.call_length)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "completed"
    ).scalar()

    # Sentiment distribution
    sentiments = db.query(
        ApiResponses.normalized_insights["OverallSentiment"].as_string(),
        func.count(ApiResponses.id)
    ).join(
        AssetFile, ApiResponses.asset_file_id == AssetFile.id
    ).filter(
        AssetFile.user_auth_id == current_user.id
    ).group_by(
        ApiResponses.normalized_insights["OverallSentiment"].as_string()
    ).all()

    sentiment_distribution = {
        sentiment if sentiment else "Unknown": count
        for sentiment, count in sentiments
    }
    responses = db.query(ApiResponses).join(
        AssetFile, ApiResponses.asset_file_id == AssetFile.id
    ).filter(
        AssetFile.user_auth_id == current_user.id
    ).all()

    calls_per_day_map = defaultdict(int)
    all_assets = db.query(AssetFile).filter(
        AssetFile.user_auth_id == current_user.id
    ).all()

    for asset in all_assets:
        if asset.created_date_time:
            day = asset.created_date_time.date().isoformat()
            calls_per_day_map[day] += 1

    calls_per_day = [
        {"date": k, "count": v}
        for k, v in sorted(calls_per_day_map.items())
    ]

    languages = (
        db.query(AssetFile.language, func.count(AssetFile.id))
        .filter(AssetFile.user_auth_id == current_user.id)
        .filter(AssetFile.language.isnot(None))
        .filter(func.lower(AssetFile.language) != "unknown")
        .group_by(AssetFile.language)
        .all()
    )
    language_distribution = [
        {"name": (name or "Unknown"), "value": count}
        for name, count in sorted(languages, key=lambda row: row[1], reverse=True)
    ]

    keyword_counter = Counter()

    for r in responses:
        if not r.normalized_insights:
            continue

        keywords = r.normalized_insights.get("KeywordCounts")

        if not keywords:
            continue

        if isinstance(keywords, dict):
            for k, v in keywords.items():
                if isinstance(v, int):
                    keyword_counter[k] += v

        elif isinstance(keywords, list):
            for item in keywords:
                if isinstance(item, dict):
                    key = item.get("keyword") or item.get("term")
                    count = item.get("count", 1)
                    if key:
                        keyword_counter[key] += count

    top_keywords = dict(keyword_counter.most_common(10))


    type_counter = {}
    groups = []

    def normalize_label(label: str):
        return label.lower().strip()

    def find_group(label):
        label_norm = normalize_label(label)

        for existing in groups:
            existing_norm = normalize_label(existing)

            # similarity threshold
            score = fuzz.token_set_ratio(label_norm, existing_norm)

            if score >= 60:
                return existing

        return None


    for r in responses:
        if not r.normalized_insights:
            continue

        call_type = r.normalized_insights.get("CallType")

        if not call_type:
            continue

        existing_group = find_group(call_type)

        if existing_group:
            type_counter[existing_group] += 1
        else:
            groups.append(call_type)
            type_counter[call_type] = 1


    call_types = [
        {"name": k, "value": v}
        for k, v in type_counter.items()
    ]


    return {
        "total_calls": total_calls or 0,
        "completed_calls": completed_calls or 0,
        "failed_calls": failed_calls or 0,
        "average_call_duration_sec": round(avg_duration or 0, 2),
        "sentiment_distribution": sentiment_distribution,
        "recent_calls": [
            {
                "asset_id": c.id,
                "filename": c.filename,
                "status": c.status,
                "call_length": c.call_length
            } for c in recent_calls
        ],
        "calls_per_day": calls_per_day,
        "language_distribution": language_distribution,
        "top_keywords": top_keywords,
        "call_types": call_types,
        "user": {
            "first_name": current_user.first_name,
            "last_name": current_user.last_name
        },
    }

@router.get("/{asset_id}/audio")
def get_audio(asset_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    if not asset.filepath or not os.path.exists(asset.filepath):
        raise HTTPException(status_code=404, detail="Audio file missing")

    media_type, _ = mimetypes.guess_type(asset.filepath)

    return FileResponse(
        asset.filepath,
        media_type=media_type or "audio/mpeg"
    )


@router.get("", status_code=status.HTTP_200_OK)
def list_assets(
    status_filter: list[str] | None = Query(None),
    language: list[str] | None = Query(None),
    sentiment: list[str] | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    min_duration: int | None = Query(None),
    max_duration: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str | None = Query("created_date_time"),
    order: str | None = Query("desc"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = (
        db.query(AssetFile)
        .outerjoin(ApiResponses, ApiResponses.asset_file_id == AssetFile.id)
        .filter(AssetFile.user_auth_id == current_user.id)
    )

    # Filter: status
    if status_filter:
        query = query.filter(AssetFile.status.in_(status_filter))

    # Filter: language
    if language:
        query = query.filter(AssetFile.language.in_(language))

    # Filter: date range
    if from_date:
        query = query.filter(AssetFile.created_date_time >= from_date)

    if to_date:
        to_date = to_date + timedelta(days=1)
        query = query.filter(AssetFile.created_date_time < to_date)

    # Filter: duration range
    if min_duration is not None:
        query = query.filter(AssetFile.call_length >= min_duration)

    if max_duration is not None:
        query = query.filter(AssetFile.call_length <= max_duration)

    # Filter: overall sentiment (inside JSON)
    if sentiment:
        query = query.filter(
            ApiResponses.normalized_insights["OverallSentiment"].as_string().in_(sentiment)
        )

    # Search: filename OR transcript text
    if search:
        query = query.filter(
            or_(
                AssetFile.filename.ilike(f"%{search}%"),
                ApiResponses.normalized_transcript.cast(String).ilike(f"%{search}%")
            )
        )

    # Safe sorting
    allowed_sorts = {
        "created_date_time": AssetFile.created_date_time,
        "call_length": AssetFile.call_length,
        "status": AssetFile.status,
        "language": AssetFile.language
    }

    sort_column = allowed_sorts.get(sort_by, AssetFile.created_date_time)


    if order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    total = query.count()

    assets = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": [
            {
                "asset_id": asset.id,
                "filename": asset.filename,
                "status": asset.status,
                "language": asset.language,
                "call_length": asset.call_length,
                "created_date_time": asset.created_date_time,
                "processing_stage": asset.processing_stage,
                "error_reason": asset.error_reason,
            }
            for asset in assets
        ]
    }


@router.get("/{asset_id}/analysis", status_code=status.HTTP_200_OK)
def get_asset_analysis(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    analysis_language: str = Query("en", pattern="^(en|original)$"),
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    if asset.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Asset not ready. Current status: {asset.status}"
        )

    response = (
        db.query(ApiResponses)
        .filter(ApiResponses.asset_file_id == asset.id)
        .first()
    )

    if not response:
        raise HTTPException(
            status_code=404,
            detail="Analysis not available"
        )
    
    selected_insights, canonical_insights, source_lang, available = _select_insights_view(
        response, analysis_language, db
    )

    variants = (response.normalized_transcript or {}).get("variants", {})
    available_variants = ["original"]
    if "en" in variants:
        available_variants.append("en")

    return {
        "asset_id": asset.id,
        "filename": asset.filename,
        "language": asset.language,
        "call_length": asset.call_length,
        "normalized_insights": selected_insights,
        "normalized_transcript": response.normalized_transcript,
        "sentence_sentiment": response.sentence_sentiment,
        "performance_metrics": response.performance_metrics,
        "llm_usage": response.llm_usage,
        "transcription_usage": response.transcription_usage,
        "master_json": response.master_json,
        "analysis_output_mode": asset.analysis_output_mode,
        "transcript_mode": asset.transcript_mode,
        "target_language": asset.target_language,
        "available_transcript_variants": available_variants,
        "normalized_insights_en": canonical_insights,
        "analysis_language": analysis_language,
        "source_language_code": source_lang,
        "available_analysis_languages": available,
    }

@router.get("/{asset_id}/transcript", status_code=status.HTTP_200_OK)
def get_transcript(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    response = (
        db.query(ApiResponses)
        .filter(ApiResponses.asset_file_id == asset.id)
        .first()
    )

    if not response:
        raise HTTPException(status_code=404, detail="Transcript not ready")

    nt = response.normalized_transcript or {}

    return {
        "utterances": response.normalized_transcript.get("utterances", []),
        "variants": nt.get("variants", {"original": {"utterances": nt.get("utterances", [])}})
    }


@router.get("/{asset_id}", status_code=status.HTTP_200_OK)
def get_asset_metadata(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "asset_id": asset.id,
        "filename": asset.filename,
        "status": asset.status,
        "language": asset.language,
        "call_length": asset.call_length,
        "created_date_time": asset.created_date_time,
        "started_at": asset.started_at,
        "completed_at": asset.completed_at,
        "processing_stage": asset.processing_stage,
        "error_reason": asset.error_reason,
    }

@router.get("/{asset_id}/status", status_code=status.HTTP_200_OK)
def get_asset_status(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "asset_id": asset.id,
        "status": asset.status
    }

@router.get("/{asset_id}/export/transcript")
def export_transcript(
    asset_id: int,
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status != "completed":
        raise HTTPException(status_code=409, detail=f"Asset not ready. Current status: {asset.status}")

    response_obj = db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset.id).first()
    if not response_obj:
        raise HTTPException(status_code=404, detail="Transcript not available")

    fmt = format.lower().strip()
    if fmt != "pdf":
        raise HTTPException(status_code=400, detail="Invalid format. Use pdf")

    pdf_bytes = _transcript_pdf(asset, response_obj, current_user)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate transcript PDF")
    filename = f"transcript_asset_{asset.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{asset_id}/export/analysis")
def export_analysis(
    asset_id: int,
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    lang: str = Query("en", pattern="^(en|original)$"),
):
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status != "completed":
        raise HTTPException(status_code=409, detail=f"Asset not ready. Current status: {asset.status}")

    response_obj = db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset.id).first()
    if not response_obj:
        raise HTTPException(status_code=404, detail="Analysis not available")

    fmt = format.lower().strip()

    if fmt != "pdf":
        raise HTTPException(status_code=400, detail="Invalid format. Use pdf")

    selected_insights, _, _, _ = _select_insights_view(response_obj, lang, db)

    pdf_bytes = _analysis_pdf(asset, response_obj, current_user, insights_override=selected_insights)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate analysis PDF")
    filename = f"analysis_{lang}_asset_{asset.id}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
