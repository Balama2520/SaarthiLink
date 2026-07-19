from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

from app.models.models import User
from app.services.auth_service import AuthService
from app.core.dependencies.services import get_auth_service

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
    auth_service: AuthService = Depends(get_auth_service)
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
