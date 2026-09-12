from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User
from app.database.connection import get_db
from app.repositories.note_repository import NoteRepository
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["notes"])


def _get_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(NoteRepository(db))


class GenerateNoteBody(BaseModel):
    topic: str
    depth: Optional[str] = "detailed"


@router.post("/generate")
async def generate_note(
    body: GenerateNoteBody,
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    return await svc.generate_note(current_user.id, body.topic, body.depth or "detailed")


@router.get("/list")
def list_notes(
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    return svc.list_notes(current_user.id)


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    svc.delete_note(current_user.id, note_id)
    return {"status": "deleted"}
