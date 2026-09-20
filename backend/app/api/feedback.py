"""
Feedback API Router — Saarthi 34-Feature Rating & Product Feedback System
=========================================================================
Endpoints for submitting and retrieving 34-feature ratings and product feedback.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.discovery_service import DiscoveryService
from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── 34 Features Registry (Canonical Specification) ─────────────────────────

SAARTHI_34_FEATURES = [
    # Group 1: Discovery & Matching (1-5)
    {
        "id": 1,
        "key": "job_discovery",
        "label": "Smart Job Discovery Engine",
        "group": "Job Matching",
    },
    {
        "id": 2,
        "key": "ats_resume_matching",
        "label": "ATS Resume Match & Score",
        "group": "Job Matching",
    },
    {
        "id": 3,
        "key": "skill_gap_analysis",
        "label": "Role Skill Gap Breakdown",
        "group": "Job Matching",
    },
    {
        "id": 4,
        "key": "company_intelligence",
        "label": "Company Profile & Hiring Signals",
        "group": "Job Matching",
    },
    {
        "id": 5,
        "key": "personalized_job_feed",
        "label": "Personalized Opportunity Feed",
        "group": "Job Matching",
    },
    # Group 2: Resume & Profile (6-10)
    {
        "id": 6,
        "key": "resume_parser",
        "label": "PDF / DOCX Multi-Resume Parsing",
        "group": "Resume & Profile",
    },
    {
        "id": 7,
        "key": "ats_optimization",
        "label": "ATS Keyword Optimization Suggestions",
        "group": "Resume & Profile",
    },
    {
        "id": 8,
        "key": "portfolio_integrations",
        "label": "GitHub / LinkedIn / Portfolio Sync",
        "group": "Resume & Profile",
    },
    {
        "id": 9,
        "key": "resume_versioning",
        "label": "Resume Versioning & History",
        "group": "Resume & Profile",
    },
    {
        "id": 10,
        "key": "profile_export",
        "label": "Structured Profile Export",
        "group": "Resume & Profile",
    },
    # Group 3: Career Copilot & AI (11-16)
    {
        "id": 11,
        "key": "career_copilot_chat",
        "label": "AI Career Copilot Chat Assistant",
        "group": "Career Copilot",
    },
    {
        "id": 12,
        "key": "huggingface_brain",
        "label": "Saarthi AI Brain Model Integration",
        "group": "Career Copilot",
    },
    {
        "id": 13,
        "key": "learning_roadmaps",
        "label": "Personalized Learning Roadmaps",
        "group": "Career Copilot",
    },
    {
        "id": 14,
        "key": "goal_decomposition",
        "label": "AI Goal Decomposition & Milestones",
        "group": "Career Copilot",
    },
    {
        "id": 15,
        "key": "interview_preparation",
        "label": "Mock Interview & Technical Q&A Coach",
        "group": "Career Copilot",
    },
    {
        "id": 16,
        "key": "voice_interviews",
        "label": "Speech-to-Text Interview Practice",
        "group": "Career Copilot",
    },
    # Group 4: Application Tracking (17-21)
    {
        "id": 17,
        "key": "saved_jobs",
        "label": "Saved Jobs & Bookmarks",
        "group": "Applications",
    },
    {
        "id": 18,
        "key": "application_pipeline",
        "label": "Application Status Pipeline",
        "group": "Applications",
    },
    {
        "id": 19,
        "key": "application_notes",
        "label": "Job Notes & Research Workspace",
        "group": "Applications",
    },
    {
        "id": 20,
        "key": "custom_deadlines",
        "label": "Application Deadline Reminders",
        "group": "Applications",
    },
    {
        "id": 21,
        "key": "salary_insights",
        "label": "Salary Range & Market Benchmarks",
        "group": "Applications",
    },
    # Group 5: Graduate & Higher Studies (22-26)
    {
        "id": 22,
        "key": "graduate_hub",
        "label": "Graduate Hub & Higher Education Tools",
        "group": "Graduate & Higher Ed",
    },
    {
        "id": 23,
        "key": "exam_prep_gate_cat",
        "label": "GATE / CAT / GRE Exam Prep Trackers",
        "group": "Graduate & Higher Ed",
    },
    {
        "id": 24,
        "key": "sop_essay_feedback",
        "label": "SOP & Essay AI Reviewer",
        "group": "Graduate & Higher Ed",
    },
    {
        "id": 25,
        "key": "university_discovery",
        "label": "University Program Finder",
        "group": "Graduate & Higher Ed",
    },
    {
        "id": 26,
        "key": "scholarship_finder",
        "label": "Scholarship & Grant Opportunities",
        "group": "Graduate & Higher Ed",
    },
    # Group 6: Workspaces & Collaboration (27-30)
    {
        "id": 27,
        "key": "document_workspaces",
        "label": "Document & Research Workspaces",
        "group": "Workspaces",
    },
    {
        "id": 28,
        "key": "rag_document_search",
        "label": "RAG Multi-Document AI Search",
        "group": "Workspaces",
    },
    {
        "id": 29,
        "key": "project_showcase",
        "label": "Project Showcase Builder",
        "group": "Workspaces",
    },
    {
        "id": 30,
        "key": "career_toolkit",
        "label": "Career Utilities & Calculators",
        "group": "Workspaces",
    },
    # Group 7: Recruiter & Ecosystem (31-34)
    {
        "id": 31,
        "key": "opportunity_submission",
        "label": "Public Opportunity Signal Submissions",
        "group": "Ecosystem",
    },
    {
        "id": 32,
        "key": "company_hiring_portal",
        "label": "Company Hiring Signal Portal",
        "group": "Ecosystem",
    },
    {
        "id": 33,
        "key": "sheets_control_center",
        "label": "Google Sheets Job Seeding Integration",
        "group": "Ecosystem",
    },
    {
        "id": 34,
        "key": "admin_intelligence",
        "label": "Admin Career Intelligence Dashboard",
        "group": "Ecosystem",
    },
]


from typing import Any, Dict, List, Optional, Union

# ── Schemas ──────────────────────────────────────────────────────────────────


class FeatureRatingSubmission(BaseModel):
    feature_id: int
    rating: Union[str, int] = Field(
        ...,
        description="not_useful | somewhat_useful | useful | very_useful | extremely_valuable | not_sure | 1..5",
    )
    comment: Optional[str] = None
    is_want_next: bool = False


class ProductFeedbackSubmission(BaseModel):
    message: Optional[str] = None
    category: Optional[str] = None
    what_you_like: Optional[str] = None
    what_you_dislike: Optional[str] = None
    what_feels_confusing: Optional[str] = None
    wish_saarthi_could: Optional[str] = None
    improve_immediately: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/features")
def list_features():
    """Returns the canonical registry of all 34 Saarthi AI features."""
    return {"features": SAARTHI_34_FEATURES, "total": len(SAARTHI_34_FEATURES)}


@router.post("/feature")
def submit_feature_rating(
    payload: FeatureRatingSubmission,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Rate a specific Saarthi AI feature by ID (1 to 34).
    """
    session_id = x_session_id or "anonymous_session"
    user_id = current_user.id if current_user else None
    rating_str = str(payload.rating)

    # Lookup feature label from canonical list
    feature_info = next(
        (f for f in SAARTHI_34_FEATURES if f["id"] == payload.feature_id), None
    )
    if not feature_info:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid feature_id {payload.feature_id}. Must be 1..34.",
        )

    svc = DiscoveryService(db)
    profile = svc.repo.get_or_create_profile(session_id=session_id, user_id=user_id)
    svc.repo.save_feature_feedbacks(
        profile.id,
        [
            {
                "feature_id": payload.feature_id,
                "feature_key": feature_info["key"],
                "feature_label": feature_info["label"],
                "rating": rating_str,
                "comment": payload.comment,
                "is_want_next": payload.is_want_next,
            }
        ],
    )
    return {
        "status": "success",
        "feature_id": payload.feature_id,
        "rating": rating_str,
        "message": f"Rating recorded for {feature_info['label']}.",
    }


@router.post("/product")
def submit_product_feedback(
    payload: ProductFeedbackSubmission,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Submit general product feedback."""
    session_id = x_session_id or "anonymous_session"
    user_id = current_user.id if current_user else None

    dump = payload.model_dump()
    if dump.get("message") and not dump.get("what_you_like"):
        dump["what_you_like"] = dump["message"]

    svc = DiscoveryService(db)
    profile = svc.repo.get_or_create_profile(session_id=session_id, user_id=user_id)
    svc.repo.save_product_feedback(profile.id, dump)
    return {
        "status": "success",
        "message": "Thank you for your feedback! It will help shape the future of Saarthi AI.",
    }
