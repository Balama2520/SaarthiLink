from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.admin_service import AdminService
from app.core.dependencies.services import get_admin_service

router = APIRouter(prefix="/admin", tags=["admin"])

class AdminStatsResponse(BaseModel):
    total_users: int
    total_chat_sessions: int
    total_projects: int
    total_applications: int
    active_models: list[str]
    recent_users: list[dict]

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    return admin_service.get_stats()
