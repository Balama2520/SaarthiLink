from sqlalchemy.orm import Session
from app.models.models import InterviewSession

class InterviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, interview: InterviewSession) -> InterviewSession:
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview
