"""
Sessions + Chat router.
Manages ChatSession CRUD and the streaming /chat + /chat/local endpoints
that the ChatCoach page consumes.
"""

import logging
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User, ChatSession, ChatMessage, Resume, UserProfile, UserSkill
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
    # AIGateway adds the selected personality system prompt itself. Keeping
    # this request payload to history plus the user message avoids duplicates.
    messages = []

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

    # Give authenticated chat the same resume/profile context used by
    # Copilot, without exposing another user's records or sending raw files.
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.parsed_json.isnot(None))
        .order_by(Resume.created_at.desc())
        .first()
    )
    skills = [
        skill.skill_name
        for skill in db.query(UserSkill).filter(UserSkill.user_id == current_user.id).limit(40).all()
    ]
    context = {
        "target_role": profile.target_role if profile else None,
        "profile_summary": profile.background_summary if profile else None,
        "skills": skills,
    }
    if resume and resume.parsed_json:
        try:
            parsed = json.loads(resume.parsed_json)
            context["resume_summary"] = parsed.get("summary")
            context["resume_skill_gaps"] = parsed.get("skill_gaps", [])
            context["resume_strengths"] = parsed.get("strengths", [])
        except (TypeError, json.JSONDecodeError):
            pass
    messages.insert(
        0,
        {
            "role": "system",
            "content": "Use this private career context when relevant; do not invent missing facts:\n"
            + json.dumps(context, ensure_ascii=True),
        },
    )

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
