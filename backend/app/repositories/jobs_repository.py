from sqlalchemy.orm import Session
from app.models.models import JobApplication

class JobsRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, job: JobApplication) -> JobApplication:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job
