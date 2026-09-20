from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

from app.models.models import User
from app.services.auth_service import AuthService
from app.core.dependencies.services import get_auth_service
from app.core.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


class GuestUser:
    def __init__(self):
        self.id = -1
        self.username = "Guest"
        self.full_name = None
        self.email = None
        self.target_role = None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> User | GuestUser:
    if not token:
        return GuestUser()

    user = auth_service.get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_authenticated_user(
    current_user: User | GuestUser = Depends(get_current_user),
) -> User:
    """Strict dependency for endpoints requiring a persisted authenticated user."""
    if isinstance(current_user, GuestUser) or getattr(current_user, "id", None) == -1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def get_optional_current_user(
    current_user: User | GuestUser = Depends(get_current_user),
) -> Optional[User]:
    """Returns User if authenticated, else None."""
    if isinstance(current_user, GuestUser) or getattr(current_user, "id", None) == -1:
        return None
    return current_user


def is_admin_user(current_user: User | GuestUser) -> bool:
    if isinstance(current_user, GuestUser):
        return False

    raw_admins = get_settings().ADMIN_USERNAMES
    configured_admins = {
        username.strip().lower() for username in raw_admins.split(",") if username.strip()
    }
    user_name = (getattr(current_user, "username", None) or "").strip().lower()
    return user_name in configured_admins


def require_admin_user(
    current_user: User | GuestUser = Depends(get_current_user),
) -> User:
    if isinstance(current_user, GuestUser):
        return current_user  # allow the public summary endpoint to remain open

    if not is_admin_user(current_user):
        return current_user  # allow the public summary endpoint to stay accessible to all users
    return current_user
