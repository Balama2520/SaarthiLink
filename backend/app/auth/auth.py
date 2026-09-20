from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.schemas.auth import UserCreate, Token
from app.services.auth_service import AuthService
from app.core.dependencies.services import get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(
    user_data: UserCreate, auth_service: AuthService = Depends(get_auth_service)
):
    return auth_service.register_user(user_data.username, user_data.password)


@router.post("/login", response_model=Token)
async def login(
    request: Request, auth_service: AuthService = Depends(get_auth_service)
):
    form_data = await request.form()
    json_data = None
    try:
        json_data = await request.json()
    except Exception:
        json_data = None

    username = None
    password = None

    if json_data and isinstance(json_data, dict):
        username = json_data.get("username")
        password = json_data.get("password")

    if not username or not password:
        username = form_data.get("username")
        password = form_data.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=400, detail="Username and password are required"
        )

    return auth_service.authenticate_user(username, password)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: RefreshRequest, auth_service: AuthService = Depends(get_auth_service)
):
    return auth_service.refresh_access_token(request.refresh_token)


@router.post("/logout")
def logout(
    request: RefreshRequest, auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.logout(request.refresh_token)
    return {"message": "Successfully logged out"}
