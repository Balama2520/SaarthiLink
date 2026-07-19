import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException

from app.models.models import User
from app.repositories.user_repository import UserRepository
from app.core.config import get_settings

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
        # bcrypt has a maximum length of 72 bytes
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
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    def register_user(self, username: str, password: str) -> dict:
        db_user = self.user_repo.get_user_by_username(username)
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        new_user = User(
            username=username,
            hashed_password=self.get_password_hash(password)
        )
        new_user = self.user_repo.create_user(new_user)
        
        access_token = self.create_access_token(data={"sub": new_user.username})
        return {"access_token": access_token, "token_type": "bearer"}

    def authenticate_user(self, username: str, password: str) -> dict:
        user = self.user_repo.get_user_by_username(username)
        if not user or not self.verify_password(password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect username or password")
        
        access_token = self.create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}

    def get_user_from_token(self, token: str) -> Optional[User]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
        except JWTError:
            return None
            
        return self.user_repo.get_user_by_username(username)
