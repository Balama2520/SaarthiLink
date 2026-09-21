"""Administrative statistics endpoints with public summary access."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_admin_user
from app.core.config import get_settings
from app.models.models import (
    User,
    Job,
    UserDiscoveryProfile,
    FeatureFeedback,
    ProductFeedback,
    ContactRequest,
    OpportunitySignal,
    CompanyProfile,
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
    settings = get_settings()

    recent = repo.get_recent_users(5)
    sheets_service = GoogleSheetsService()
    sheets_status_info = sheets_service.status()

    ai_status = {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "hf_configured": bool(settings.HF_SPACE_ID and settings.HF_API_TOKEN),
        "primary_provider": "gemini" if settings.GEMINI_API_KEY else "none",
        "secondary_provider": (
            "huggingface"
            if (settings.HF_SPACE_ID and settings.HF_API_TOKEN)
            else "none"
        ),
    }

    total_jobs = db.query(Job).count() if db.query(Job) else 0
    total_discovery_profiles = db.query(UserDiscoveryProfile).count()
    total_feature_feedbacks = db.query(FeatureFeedback).count()
    total_contact_requests = db.query(ContactRequest).count()
    total_opportunity_signals = db.query(OpportunitySignal).count()
    total_company_profiles = db.query(CompanyProfile).count()

    recent_contacts = (
        db.query(ContactRequest)
        .order_by(ContactRequest.created_at.desc())
        .limit(10)
        .all()
    )
    recent_discoveries = (
        db.query(UserDiscoveryProfile)
        .order_by(UserDiscoveryProfile.created_at.desc())
        .limit(10)
        .all()
    )
    recent_opps = (
        db.query(OpportunitySignal)
        .order_by(OpportunitySignal.created_at.desc())
        .limit(10)
        .all()
    )
    recent_feedbacks = (
        db.query(ProductFeedback)
        .order_by(ProductFeedback.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "is_admin": True,
        "summary_mode": False,
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
        "recent_users": [{"id": u.id, "username": u.username} for u in recent],
        "recent_contact_requests": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "role_type": c.role_type or "General User",
                "reason": c.reason or "Inquiry",
                "message": c.message,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in recent_contacts
        ],
        "recent_discovery_profiles": [
            {
                "id": d.id,
                "user_type": d.user_type or "Student / Seeker",
                "status": d.status,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in recent_discoveries
        ],
        "recent_opportunity_signals": [
            {
                "id": o.id,
                "company": o.company or "N/A",
                "role": o.role or "N/A",
                "public_job_url": o.public_job_url,
                "validation_status": o.validation_status,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent_opps
        ],
        "recent_product_feedbacks": [
            {
                "id": pf.id,
                "what_you_like": pf.what_you_like,
                "what_you_dislike": pf.what_you_dislike,
                "what_feels_missing": pf.what_feels_missing,
                "wish_saarthi_could": pf.wish_saarthi_could,
                "created_at": pf.created_at.isoformat() if pf.created_at else None,
            }
            for pf in recent_feedbacks
        ],
    }
