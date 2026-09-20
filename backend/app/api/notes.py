from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import Note, User
from app.database.connection import get_db
from app.repositories.note_repository import NoteRepository
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["notes"])


def _get_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(NoteRepository(db))


class GenerateNoteBody(BaseModel):
    topic: str
    depth: Optional[str] = "detailed"


class NoteBody(BaseModel):
    title: str
    content: str
    tags: Optional[str] = ""
    workspace_id: Optional[str] = None


@router.post("/generate")
async def generate_note(
    body: GenerateNoteBody,
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    return await svc.generate_note(
        current_user.id, body.topic, body.depth or "detailed"
    )


@router.get("/list")
def list_notes(
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    return svc.list_notes(current_user.id)


@router.post("")
def create_note(
    body: NoteBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Create a standalone or workspace-linked markdown note."""
    note = Note(
        user_id=current_user.id,
        title=body.title,
        content=body.content,
        tags=body.tags or "",
        workspace_id=body.workspace_id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
    }


@router.put("/{note_id}")
def update_note(
    note_id: int,
    body: NoteBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Update a user-owned note."""
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.title, note.content, note.tags, note.workspace_id = (
        body.title,
        body.content,
        body.tags or "",
        body.workspace_id,
    )
    db.commit()
    db.refresh(note)
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
    }


@router.get("/search")
def search_notes(
    q: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Search notes by title, content, or tags within the current user's data."""
    return (
        db.query(Note)
        .filter(
            Note.user_id == current_user.id,
            (
                Note.title.ilike(f"%{q}%")
                | Note.content.ilike(f"%{q}%")
                | Note.tags.ilike(f"%{q}%")
            ),
        )
        .all()
    )


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(require_authenticated_user),
    svc: NoteService = Depends(_get_service),
):
    svc.delete_note(current_user.id, note_id)
    return {"status": "deleted"}
