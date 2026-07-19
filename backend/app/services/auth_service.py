from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status
import bcrypt

from app.core.config import get_settings
from app.repositories.user_repository import UserRepository
from app.models.models import User
from app.schemas.auth import UserCreate

settings = get_settings()

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except ValueError:
            return False

    def get_password_hash(self, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            password = password[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": int(expire.timestamp())})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def register_user(self, user_data: UserCreate) -> User:
        if self.user_repo.get_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Username already registered")
        
        new_user = User(
            username=user_data.username,
            hashed_password=self.get_password_hash(user_data.password)
        )
        return self.user_repo.create(new_user)

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        user = self.user_repo.get_by_username(username)
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        return user
