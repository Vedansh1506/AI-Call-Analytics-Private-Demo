from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from models.schemas import ChatRequest, ChatResponse, ChatSessionSummary, ChatSessionDetail
from models.model import AssetFile, ApiResponses as APIResponseModel, ChatSession
from utils.database import get_db
from routers.auth import get_current_user
from background_services.chat import ask_call

router = APIRouter(prefix="/api", tags=["chat"])


def _get_asset_and_response(asset_id: int, current_user, db: Session):
    """Shared helper — fetch asset + api_response, validate ownership."""
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Analysis not complete yet. Please wait until processing finishes.",
        )

    api_resp = (
        db.query(APIResponseModel)
        .filter(APIResponseModel.asset_file_id == asset_id)
        .first()
    )
    if not api_resp:
        raise HTTPException(status_code=404, detail="Analysis data not found")

    return asset, api_resp


# ── GET all sessions for a call ──────────────────────────────────────────────

@router.get("/chat/{asset_id}/sessions", response_model=list[ChatSessionSummary])
def list_sessions(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # verify asset ownership without needing completed status
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.asset_file_id == asset_id,
            ChatSession.user_auth_id == current_user.id,
        )
        .order_by(desc(ChatSession.updated_at))
        .all()
    )

    return [
        ChatSessionSummary(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages) if s.messages else 0,
        )
        for s in sessions
    ]


# ── GET one session ───────────────────────────────────────────────────────────

@router.get("/chat/session/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_auth_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ── DELETE one session ────────────────────────────────────────────────────────

@router.delete("/chat/session/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_auth_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"deleted": True}


# ── POST — send a message (creates or continues a session) ───────────────────

@router.post("/chat/{asset_id}", response_model=ChatResponse)
async def chat_with_call(
    asset_id: int,
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset, api_resp = _get_asset_and_response(asset_id, current_user, db)

    # ── resolve or create session ──
    if body.session_id:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == body.session_id,
                ChatSession.user_auth_id == current_user.id,
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        # new session — title = first 60 chars of first message
        session = ChatSession(
            asset_file_id=asset_id,
            user_auth_id=current_user.id,
            title=body.message[:60],
            messages=[],
        )
        db.add(session)
        db.flush()  # get session.id without committing

    # ── build Gemini history from saved messages ──
    saved_history = [
        {"role": m["role"], "parts": [{"text": m["text"]}]}
        for m in (session.messages or [])
        if m.get("role") and m.get("text")
    ]

    # ── call Gemini ──
    reply = ask_call(
        asset_id=asset_id,
        file_name=asset.filename,
        language=asset.language or "unknown",
        call_length=asset.call_length,
        normalized_insights=api_resp.normalized_insights,
        normalized_transcript=api_resp.normalized_transcript,
        conversation_history=saved_history,
        user_message=body.message,
    )

    # ── persist both turns to session ──
    updated_messages = list(session.messages or [])
    updated_messages.append({"role": "user", "text": body.message})
    updated_messages.append({"role": "model", "text": reply})

    session.messages = updated_messages
    session.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(reply=reply, session_id=session.id)