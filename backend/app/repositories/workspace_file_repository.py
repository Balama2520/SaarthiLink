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
        return resumes, docs, notes, jobs
