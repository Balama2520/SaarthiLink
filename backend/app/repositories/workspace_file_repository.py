from sqlalchemy.orm import Session
from app.models.models import Resume, Document, JobApplication, Note

class WorkspaceFileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_item_counts(self, workspace_id: str) -> dict:
        return {
            "resumes": self.db.query(Resume).filter(Resume.workspace_id == workspace_id).count(),
            "documents": self.db.query(Document).filter(Document.workspace_id == workspace_id).count(),
            "notes": self.db.query(Note).filter(Note.workspace_id == workspace_id).count(),
            "jobs": self.db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id).count()
        }

    def unlink_all_from_workspace(self, workspace_id: str) -> None:
        self.db.query(Resume).filter(Resume.workspace_id == workspace_id).update({Resume.workspace_id: None})
        self.db.query(Document).filter(Document.workspace_id == workspace_id).update({Document.workspace_id: None})
        self.db.query(Note).filter(Note.workspace_id == workspace_id).update({Note.workspace_id: None})
        self.db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id).update({JobApplication.workspace_id: None})
        self.db.commit()

    def get_resume(self, item_id: str, user_id: int):
        return self.db.query(Resume).filter(Resume.id == item_id, Resume.user_id == user_id).first()

    def get_document(self, item_id: str, user_id: int):
        return self.db.query(Document).filter(Document.id == item_id, Document.user_id == user_id).first()

    def get_note(self, item_id: int, user_id: int):
        return self.db.query(Note).filter(Note.id == item_id, Note.user_id == user_id).first()

    def get_job(self, item_id: str, user_id: int):
        return self.db.query(JobApplication).filter(JobApplication.id == item_id, JobApplication.user_id == user_id).first()

    def commit(self):
        self.db.commit()

    def get_workspace_items(self, workspace_id: str, user_id: int):
        resumes = self.db.query(Resume).filter(Resume.workspace_id == workspace_id, Resume.user_id == user_id).all()
        docs = self.db.query(Document).filter(Document.workspace_id == workspace_id, Document.user_id == user_id).all()
        notes = self.db.query(Note).filter(Note.workspace_id == workspace_id, Note.user_id == user_id).all()
        jobs = self.db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id, JobApplication.user_id == user_id).all()
        return resumes, docs, notes, jobs

    def get_unlinked_items(self, user_id: int):
        resumes = self.db.query(Resume).filter(Resume.workspace_id == None, Resume.user_id == user_id).all()
        docs = self.db.query(Document).filter(Document.workspace_id == None, Document.user_id == user_id).all()
        notes = self.db.query(Note).filter(Note.workspace_id == None, Note.user_id == user_id).all()
        jobs = self.db.query(JobApplication).filter(JobApplication.workspace_id == None, JobApplication.user_id == user_id).all()
        return {
            "resumes": [{"id": r.id, "filename": r.filename} for r in resumes],
            "docs": [{"id": d.id, "filename": d.filename} for d in docs],
            "notes": [{"id": n.id, "title": n.title} for n in notes],
            "jobs": [{"id": j.id, "job_title": j.job_title, "company": j.company} for j in jobs],
        }

    def link_item(self, workspace_id: str, item_type: str, item_id: str, user_id: int) -> None:
        """Assign an existing user-owned item to a workspace."""
        from fastapi import HTTPException
        type_map = {
            "resume": (Resume, "id"),
            "document": (Document, "id"),
            "note": (Note, "id"),
            "job": (JobApplication, "id"),
        }
        if item_type not in type_map:
            raise HTTPException(status_code=400, detail=f"Unknown item_type: {item_type}")
        model, id_col = type_map[item_type]
        obj = self.db.query(model).filter(
            getattr(model, id_col) == item_id,
            model.user_id == user_id,
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Item not found")
        obj.workspace_id = workspace_id
        self.db.commit()
