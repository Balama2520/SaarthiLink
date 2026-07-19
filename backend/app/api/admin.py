from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, ChatSession, Project, JobApplication

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
    db: Session = Depends(get_db)
):
    # In a real app, verify current_user.role == 'admin'
    # For MVP, we allow access to see dashboard
    
    total_users = db.query(func.count(User.id)).scalar()
    total_chat_sessions = db.query(func.count(ChatSession.id)).scalar()
    total_projects = db.query(func.count(Project.id)).scalar()
    total_applications = db.query(func.count(JobApplication.id)).scalar()
    
    recent_users = db.query(User).order_by(User.id.desc()).limit(5).all()
    recent_users_list = [
        {"id": u.id, "email": u.email, "username": u.username} for u in recent_users
    ]
    
    return {
        "total_users": total_users or 0,
        "total_chat_sessions": total_chat_sessions or 0,
        "total_projects": total_projects or 0,
        "total_applications": total_applications or 0,
        "active_models": ["Qwen3 8B (Local)", "DeepSeek-R1 (Local)", "Gemini-1.5-Flash (Fallback)"],
        "recent_users": recent_users_list
    }
