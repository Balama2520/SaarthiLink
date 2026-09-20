"""
Sessions + Chat router.
Manages ChatSession CRUD and the streaming /chat + /chat/local endpoints
that the ChatCoach page consumes.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies.auth import get_current_user, require_authenticated_user
from app.models.models import User, ChatSession, ChatMessage
from app.database.connection import get_db
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sessions"])
chat_router = APIRouter(tags=["chat"])


# ── Session management ────────────────────────────────────────────────────────


@router.get("/sessions/")
def list_sessions(
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return [
        {"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()}
        for s in sessions
    ]


class CreateSessionBody(BaseModel):
    title: str = "New Conversation"


@router.post("/sessions/")
def create_session(
    body: CreateSessionBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=body.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
    }


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return None  # 204


@router.get("/sessions/{session_id}/messages")
def get_messages(
    session_id: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [
        {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()}
        for m in session.messages
    ]


# ── Chat endpoints ────────────────────────────────────────────────────────────


class ChatBody(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = "default"
    model: Optional[str] = "phi3"
    personality: Optional[str] = "default"


@chat_router.post("/chat")
async def chat(
    body: ChatBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    system_prompt = PromptManager.load(f"system/{body.personality or 'default'}")
    messages = [{"role": "system", "content": system_prompt}]

    # Persist message to session
    if body.session_id and body.session_id != "default":
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(12)
            .all()[::-1]
        )
        messages.extend(
            {"role": item.role, "content": item.content} for item in history
        )
        user_msg = ChatMessage(session_id=session.id, role="user", content=body.message)
        db.add(user_msg)
        db.commit()
    messages.append({"role": "user", "content": body.message})

    async def stream_gen():
        accumulated = ""
        async for chunk in AIGateway().generate_response_stream(
            messages, body.model or "phi3", personality=body.personality or "default"
        ):
            accumulated += chunk
            yield chunk.encode("utf-8")
        # Save assistant response
        if body.session_id and body.session_id != "default":
            session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.id == body.session_id,
                    ChatSession.user_id == current_user.id,
                )
                .first()
            )
            if session:
                ai_msg = ChatMessage(
                    session_id=session.id, role="assistant", content=accumulated
                )
                db.add(ai_msg)
                db.commit()

    return StreamingResponse(stream_gen(), media_type="text/plain")


class LocalChatBody(BaseModel):
    message: str
    model: Optional[str] = "phi3"
    personality: Optional[str] = "default"
    local_profile: Optional[dict] = None
    local_history: Optional[list] = None


@chat_router.post("/chat/local")
async def chat_local(body: LocalChatBody):
    """Unauthenticated streaming chat — uses local profile context from the browser."""
    profile_ctx = ""
    if body.local_profile:
        profile_ctx = f"User context: {body.local_profile}\n\n"

    system_prompt = PromptManager.load(f"system/{body.personality or 'default'}")
    messages = [{"role": "system", "content": system_prompt + "\n" + profile_ctx}]

    for h in body.local_history or []:
        messages.append(
            {"role": h.get("role", "user"), "content": h.get("content", "")}
        )
    messages.append({"role": "user", "content": body.message})

    async def stream_gen():
        async for chunk in AIGateway().generate_response_stream(
            messages, body.model or "phi3", personality=body.personality or "default"
        ):
            yield chunk.encode("utf-8")

    return StreamingResponse(stream_gen(), media_type="text/plain")


from fastapi import UploadFile, File
from app.services.voice_service import VoiceService


@chat_router.post("/chat/voice-to-text")
async def voice_to_text(file: UploadFile = File(...)):
    content = await file.read()
    text = await VoiceService().transcribe_audio(content)
    return {"text": text}
