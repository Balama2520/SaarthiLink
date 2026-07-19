from sqlalchemy.orm import Session
from app.models.models import User
from typing import Optional, List

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_username(self, username: str) -> Optional[User]:
        return self.db.query(User).filter(User.username == username).first()

    def create_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def count_users(self) -> int:
        return self.db.query(User).count()

    def get_recent_users(self, limit: int = 5) -> List[User]:
        return self.db.query(User).order_by(User.id.desc()).limit(limit).all()
