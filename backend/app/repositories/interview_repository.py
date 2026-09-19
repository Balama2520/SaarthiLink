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

    def get_for_user(self, session_id: str, user_id: int) -> InterviewSession | None:
        return self.db.query(InterviewSession).filter(
            InterviewSession.id == session_id, InterviewSession.user_id == user_id
        ).first()

    def list_for_user(self, user_id: int) -> list[InterviewSession]:
        return self.db.query(InterviewSession).filter(
            InterviewSession.user_id == user_id
        ).order_by(InterviewSession.created_at.desc()).all()

    def save(self, interview: InterviewSession) -> InterviewSession:
        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)
        return interview
