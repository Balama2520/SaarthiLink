from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from pydantic import BaseModel
from datetime import datetime, timezone
import json
import logging

from app.database.connection import get_db, Base
from app.auth.auth import get_current_user
from app.models.models import User
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/notes", tags=["notes"])
logger = logging.getLogger(__name__)

# ── Model ──────────────────────────────────────────────────────────────────
class Note(Base):
    __tablename__ = "notes"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# ── Schemas ─────────────────────────────────────────────────────────────────
class NoteCreate(BaseModel):
    title: str
    content: str
    tags: str = ""

class NoteGenerateRequest(BaseModel):
    topic: str
    depth: str = "detailed"  # brief | detailed | comprehensive

# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/generate")
async def generate_note(
    request: NoteGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prompt = f"""
    You are a study assistant. Generate well-structured, concise study notes on the topic: "{request.topic}".
    Depth level: {request.depth}

    Output STRICTLY as a valid JSON object. Do not output markdown fences, just the JSON:
    {{
        "title": "Topic Title",
        "summary": "One paragraph summary",
        "key_points": ["Point 1", "Point 2", "Point 3"],
        "details": "Longer explanation of the topic...",
        "flashcards": [
            {{"q": "Question?", "a": "Answer."}}
        ],
        "tags": "comma,separated,tags"
    }}
    """

    messages = [{"role": "user", "content": prompt}]
    full_response = ""
    async for chunk in generate_response_stream_async(messages, personality="learning"):
        full_response += chunk

    try:
        clean = full_response.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.endswith("```"):
            clean = clean[:-3]
        data = json.loads(clean.strip())

        # Save to DB
        note = Note(
            user_id=current_user.id,
            title=data.get("title", request.topic),
            content=data.get("details", ""),
            tags=data.get("tags", "")
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        data["id"] = note.id
        return data
    except Exception as e:
        logger.error(f"Note generation failed: {e}\nRaw: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to generate notes. Please try again.")


@router.get("/list")
async def list_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notes = db.query(Note).filter(Note.user_id == current_user.id).order_by(Note.created_at.desc()).all()
    return [
        {"id": n.id, "title": n.title, "tags": n.tags, "created_at": n.created_at.isoformat()}
        for n in notes
    ]


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"status": "deleted"}
