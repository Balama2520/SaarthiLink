"""
Feedback API Router — Saarthi Public Feature Rating & Product Feedback System
=========================================================================
Endpoints for submitting and retrieving public feature ratings and product feedback.
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.discovery_service import DiscoveryService
from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User
from app.core.feature_registry import PUBLIC_FEATURES

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Legacy source list retained below for migration compatibility. ──────────

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
        "label": "Project & Coding Showcase Builder",
        "group": "Workspaces",
    },
    {
        "id": 30,
        "key": "team_sharing",
        "label": "Peer Progress Sharing & Workspaces",
        "group": "Workspaces",
    },
    # Group 7: Career Strategy & Extras (31-34)
    {
        "id": 31,
        "key": "company_decoding",
        "label": "AI Company Strategy Decoder",
        "group": "Career Toolkit",
    },
    {
        "id": 32,
        "key": "outreach_templates",
        "label": "Cold Outreach Cold-Email Generator",
        "group": "Career Toolkit",
    },
    {
        "id": 33,
        "key": "salary_negotiation",
        "label": "Salary Guidance & Negotiation Script",
        "group": "Career Toolkit",
    },
    {
        "id": 34,
        "key": "daily_missions",
        "label": "Daily Gamified Career Missions",
        "group": "Career Toolkit",
    },
]


# Keep the public API name stable for existing imports while using the single
# canonical 31-feature contract everywhere.
SAARTHI_34_FEATURES = PUBLIC_FEATURES


class FeatureFeedbackSchema(BaseModel):
    feature_id: int
    rating: str = Field("useful", description="valuable | useful | neutral | bad")
    comment: Optional[str] = None


class ProductFeedbackPayload(BaseModel):
    session_id: Optional[str] = None
    net_promoter_score: int = Field(..., ge=0, le=10)
    primary_benefit: Optional[str] = None
    missing_capabilities: Optional[str] = None
    feature_feedbacks: List[FeatureFeedbackSchema] = []


@router.post("")
def submit_feedback(
    payload: ProductFeedbackPayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Submits multi-feature rating matrices and overall system reviews."""
    session_id = payload.session_id or x_session_id or "anonymous_feedback"
    user_id = current_user.id if current_user else None

    # Normalise feature labels matching registry metadata schemas
    registry_map = {f["id"]: f for f in SAARTHI_34_FEATURES}
    feedbacks_processed = []

    for item in payload.feature_feedbacks:
        if item.feature_id in registry_map:
            feat = registry_map[item.feature_id]
            feedbacks_processed.append(
                {
                    "feature_id": item.feature_id,
                    "feature_key": feat["key"],
                    "feature_label": feat["label"],
                    "rating": item.rating,
                    "comment": item.comment,
                }
            )

    data = {
        "session_id": session_id,
        "nps": payload.net_promoter_score,
        "benefit": payload.primary_benefit,
        "missing": payload.missing_capabilities,
        "features": feedbacks_processed,
    }

    svc = DiscoveryService(db)
    return svc.process_system_feedback(data, user_id=user_id)


@router.get("/features")
def get_features_registry():
    """Returns the canonical catalog of all public evaluation features."""
    return {
        "total": len(SAARTHI_34_FEATURES),
        "total_registered": len(SAARTHI_34_FEATURES),
        "features": SAARTHI_34_FEATURES,
    }


@router.post("/feature")
def submit_feature_rating_legacy(
    payload: FeatureFeedbackSchema,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    registry_map = {feature["id"]: feature for feature in SAARTHI_34_FEATURES}
    feature = registry_map.get(payload.feature_id)
    if not feature:
        raise HTTPException(status_code=400, detail="Unknown feature id")
    session_id = x_session_id or "anonymous_feedback"
    profile = DiscoveryService(db).repo.get_or_create_profile(
        session_id=session_id,
        user_id=current_user.id if current_user else None,
    )
    DiscoveryService(db).repo.save_feature_feedbacks(
        profile.id,
        [{
            "feature_id": payload.feature_id,
            "feature_key": feature["key"],
            "feature_label": feature["label"],
            "rating": payload.rating,
            "comment": payload.comment,
        }],
    )
    return {"status": "success", "feature_id": payload.feature_id}


@router.post("/product")
def submit_product_feedback_legacy(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    session_id = payload.pop("session_id", None) or x_session_id or "anonymous_feedback"
    profile = DiscoveryService(db).repo.get_or_create_profile(
        session_id=session_id,
        user_id=current_user.id if current_user else None,
    )
    DiscoveryService(db).repo.save_product_feedback(profile.id, payload)
    return {"status": "success", "profile_id": profile.id}
