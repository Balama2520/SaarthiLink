import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException

from app.models.models import User, RefreshToken
from app.repositories.user_repository import UserRepository
from app.core.config import get_settings

settings = get_settings()


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def _role_for_user(self, username: str) -> str:
        configured_admins = {
            admin.strip().lower() for admin in settings.ADMIN_USERNAMES.split(",") if admin.strip()
        }
        return "admin" if username.strip().lower() in configured_admins else "user"

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except ValueError:
            return False

    def get_password_hash(self, password: str) -> str:
        # bcrypt has a maximum length of 72 bytes
        if len(password.encode("utf-8")) > 72:
            raise HTTPException(
                status_code=422,
                detail="Password must be 72 bytes or fewer",
            )
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

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

    def create_refresh_token_for_user(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        refresh_token = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
        self.user_repo.create_refresh_token(refresh_token)
        return token

    def register_user(self, username: str, password: str) -> dict:
        db_user = self.user_repo.get_user_by_username(username)
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")

        new_user = User(username=username, hashed_password=self.get_password_hash(password))
        new_user = self.user_repo.create_user(new_user)

        access_token = self.create_access_token(data={"sub": new_user.username})
        refresh_token = self.create_refresh_token_for_user(new_user.id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": self._role_for_user(new_user.username),
        }

    def authenticate_user(self, username: str, password: str) -> dict:
        user = self.user_repo.get_user_by_username(username)
        if not user or not self.verify_password(password, user.hashed_password):
            # An authentication failure is not a malformed request. Returning
            # 401 lets clients consistently handle expired/invalid credentials.
            raise HTTPException(status_code=401, detail="Incorrect username or password")

        access_token = self.create_access_token(data={"sub": user.username})
        refresh_token = self.create_refresh_token_for_user(user.id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": self._role_for_user(user.username),
        }

    def refresh_access_token(self, token: str) -> dict:
        db_token = self.user_repo.get_refresh_token(token)
        if not db_token:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Ensure db_token.expires_at is timezone-aware for comparison (SQLite sometimes returns naive datetimes)
        expires_at = db_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            self.user_repo.delete_refresh_token(token)
            raise HTTPException(status_code=401, detail="Refresh token expired")

        # generate new access token
        user = db_token.owner
        access_token = self.create_access_token(data={"sub": user.username})
        return {
            "access_token": access_token,
            "refresh_token": token,
            "token_type": "bearer",
            "role": self._role_for_user(user.username),
        }

    def logout(self, token: str) -> None:
        self.user_repo.delete_refresh_token(token)

    def get_user_from_token(self, token: str) -> Optional[User]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
        except JWTError:
            return None

        return self.user_repo.get_user_by_username(username)
