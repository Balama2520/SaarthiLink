from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.note_service import NoteService
from app.core.dependencies.services import get_note_service

router = APIRouter(prefix="/notes", tags=["notes"])

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
    note_service: NoteService = Depends(get_note_service)
):
    return await note_service.generate_note(
        user_id=current_user.id,
        topic=request.topic,
        depth=request.depth
    )

@router.get("/list")
async def list_notes(
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service)
):
    return note_service.list_notes(current_user.id)

@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service)
):
    note_service.delete_note(current_user.id, note_id)
    return {"status": "deleted"}
