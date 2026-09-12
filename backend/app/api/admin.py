"""System-only administrative statistics endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_admin_user
from app.core.config import get_settings
from app.models.models import (
    User, Job, UserDiscoveryProfile, FeatureFeedback,
    ContactRequest, OpportunitySignal, CompanyProfile, ChatSession
)
from app.database.connection import get_db
from app.repositories.admin_repository import AdminRepository
from app.services.sheets_service import GoogleSheetsService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_stats(
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    repo = AdminRepository(db)
    recent = repo.get_recent_users(5)
    settings = get_settings()

    sheets_service = GoogleSheetsService()
    sheets_status_info = sheets_service.status()

    ai_status = {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "hf_configured": bool(settings.HF_SPACE_ID and settings.HF_API_TOKEN),
        "primary_provider": "gemini" if settings.GEMINI_API_KEY else "none",
        "secondary_provider": "huggingface" if (settings.HF_SPACE_ID and settings.HF_API_TOKEN) else "none"
    }

    # Safe counts for discovery & feedback entities
    total_jobs = db.query(Job).count() if db.query(Job) else 0
    total_discovery_profiles = db.query(UserDiscoveryProfile).count()
    total_feature_feedbacks = db.query(FeatureFeedback).count()
    total_contact_requests = db.query(ContactRequest).count()
    total_opportunity_signals = db.query(OpportunitySignal).count()
    total_company_profiles = db.query(CompanyProfile).count()

    return {
        "total_users": repo.count_users(),
        "total_sessions": repo.count_chat_sessions(),
        "total_projects": repo.count_projects(),
        "total_applications": repo.count_applications(),
        "total_jobs": total_jobs,
        "total_discovery_profiles": total_discovery_profiles,
        "total_feature_feedbacks": total_feature_feedbacks,
        "total_contact_requests": total_contact_requests,
        "total_opportunity_signals": total_opportunity_signals,
        "total_company_profiles": total_company_profiles,
        "sheets_status": sheets_status_info,
        "ai_status": ai_status,
        "recent_users": [
            {"id": u.id, "username": u.username}
            for u in recent
        ],
    }

