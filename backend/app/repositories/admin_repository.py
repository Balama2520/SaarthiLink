from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import User, ChatSession, Project, JobApplication

class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_users(self) -> int:
        return self.db.query(func.count(User.id)).scalar() or 0
        
    def count_chat_sessions(self) -> int:
        return self.db.query(func.count(ChatSession.id)).scalar() or 0
        
    def count_projects(self) -> int:
        return self.db.query(func.count(Project.id)).scalar() or 0
        
    def count_applications(self) -> int:
        return self.db.query(func.count(JobApplication.id)).scalar() or 0

    def get_recent_users(self, limit: int = 5):
        return self.db.query(User).order_by(User.id.desc()).limit(limit).all()
