from sqlalchemy.orm import Session
from app.models.models import User, RefreshToken
from typing import Optional, List
from datetime import timezone


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

    def create_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
        self.db.add(refresh_token)
        self.db.commit()
        self.db.refresh(refresh_token)
        return refresh_token

    def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        db_token = (
            self.db.query(RefreshToken).filter(RefreshToken.token == token).first()
        )
        if db_token and db_token.expires_at is not None:
            # SQLite stores datetimes without timezone info.
            # Make expires_at timezone-aware so comparison with
            # datetime.now(timezone.utc) doesn't raise TypeError.
            if db_token.expires_at.tzinfo is None:
                db_token.expires_at = db_token.expires_at.replace(tzinfo=timezone.utc)
        return db_token

    def delete_refresh_token(self, token: str) -> None:
        db_token = (
            self.db.query(RefreshToken).filter(RefreshToken.token == token).first()
        )
        if db_token:
            self.db.delete(db_token)
            self.db.commit()
