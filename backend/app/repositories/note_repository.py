from sqlalchemy.orm import Session
from app.models.models import Note
from typing import List, Optional

class NoteRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, note: Note) -> Note:
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def get_user_notes(self, user_id: int) -> List[Note]:
        return self.db.query(Note).filter(Note.user_id == user_id).order_by(Note.created_at.desc()).all()

    def get_note(self, note_id: int, user_id: int) -> Optional[Note]:
        return self.db.query(Note).filter(Note.id == note_id, Note.user_id == user_id).first()

    def delete(self, note: Note) -> None:
        self.db.delete(note)
        self.db.commit()
