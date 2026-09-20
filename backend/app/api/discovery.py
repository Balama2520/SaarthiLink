"""
Discovery API Router — Saarthi Career & Hiring Intelligence Discovery
======================================================================
Endpoints for multi-step career discovery, intent logging, challenge rating,
and ecosystem contribution.
"""

import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.discovery_service import DiscoveryService
from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User

router = APIRouter(prefix="/discovery", tags=["discovery"])


# ── Pydantic Request Models ──────────────────────────────────────────────────


class UserIntentInput(BaseModel):
    intent_key: str
    intent_label: Optional[str] = None
    is_primary: bool = False
    free_text: Optional[str] = None


class CareerChallengeInput(BaseModel):
    finding_relevant_jobs: Optional[int] = Field(None, ge=1, le=5)
    finding_genuine_opportunities: Optional[int] = Field(None, ge=1, le=5)
    understanding_jds: Optional[int] = Field(None, ge=1, le=5)
    knowing_qualification: Optional[int] = Field(None, ge=1, le=5)
    resume_improvement: Optional[int] = Field(None, ge=1, le=5)
    skill_gap_identification: Optional[int] = Field(None, ge=1, le=5)
    interview_preparation: Optional[int] = Field(None, ge=1, le=5)
    finding_companies: Optional[int] = Field(None, ge=1, le=5)
    tracking_applications: Optional[int] = Field(None, ge=1, le=5)
    knowing_what_to_learn: Optional[int] = Field(None, ge=1, le=5)
    biggest_difficulty: Optional[str] = None
    one_problem_to_solve: Optional[str] = None


class FeatureFeedbackItemInput(BaseModel):
    feature_id: int = Field(..., ge=1, le=34)
    feature_key: str
    feature_label: Optional[str] = None
    rating: str = Field(
        ...,
        description="not_useful | somewhat_useful | useful | very_useful | extremely_valuable | not_sure",
    )
    is_most_valuable: bool = False
    is_least_valuable: bool = False
    is_missing: bool = False
    is_want_next: bool = False
    comment: Optional[str] = None


class ProductFeedbackInput(BaseModel):
    what_you_like: Optional[str] = None
    what_you_dislike: Optional[str] = None
    what_feels_confusing: Optional[str] = None
    what_feels_unnecessary: Optional[str] = None
    what_feels_missing: Optional[str] = None
    would_use_regularly_if: Optional[str] = None
    wish_saarthi_could: Optional[str] = None
    should_never_do: Optional[str] = None
    improve_immediately: Optional[str] = None
    solve_next: Optional[str] = None
    would_recommend_if: Optional[str] = None
    skills_to_learn: Optional[str] = None
    what_to_add: Optional[str] = None
    what_to_remove: Optional[str] = None


class OpportunitySignalInput(BaseModel):
    public_job_url: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[str] = None
    additional_context: Optional[str] = None
    submitter_email: Optional[str] = None


class CompanyProfileInput(BaseModel):
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    contact_email: Optional[str] = None
    hiring_plans: Optional[str] = None


class HiringSignalInput(BaseModel):
    roles_hiring_for: Optional[str] = None
    skills_needed: Optional[str] = None
    experience_levels: Optional[str] = None
    biggest_hiring_challenge: Optional[str] = None
    interested_in_saarthi_hire: bool = False


class JobSubmissionInput(BaseModel):
    title: str
    jd_text: Optional[str] = None
    apply_link: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None


class DiscoverySubmissionRequest(BaseModel):
    session_id: Optional[str] = None
    user_type: str
    user_type_other: Optional[str] = None
    consent_given: bool = True
    intents: List[UserIntentInput] = []
    challenges: Optional[CareerChallengeInput] = None
    feature_feedbacks: List[FeatureFeedbackItemInput] = []
    product_feedback: Optional[ProductFeedbackInput] = None
    opportunity_signal: Optional[OpportunitySignalInput] = None
    company_profile: Optional[CompanyProfileInput] = None
    hiring_signal: Optional[HiringSignalInput] = None
    job_submission: Optional[JobSubmissionInput] = None
    source: str = "discover_page"


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/submit")
def submit_discovery(
    payload: DiscoverySubmissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """
    Submit full multi-step career discovery & intelligence responses.
    Publicly accessible (supports guest session_id or authenticated user).
    """
    session_id = payload.session_id or x_session_id or str(uuid.uuid4())
    user_id = current_user.id if current_user else None
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    svc = DiscoveryService(db)
    result = svc.submit_discovery_flow(
        session_id=session_id,
        data=payload.model_dump(),
        user_id=user_id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return result


@router.get("/options")
def get_discovery_options():
    """
    Returns static metadata options for the /discover multi-step wizard
    (User types, Intent choices, Feature list, Challenge areas).
    """
    return {
        "user_types": [
            {"key": "student", "label": "Student (College / University)"},
            {"key": "job_seeker", "label": "Job Seeker (Actively Looking)"},
            {"key": "fresher", "label": "Recent Graduate / Fresher"},
            {"key": "working_professional", "label": "Working Professional"},
            {"key": "career_switcher", "label": "Career Switcher"},
            {"key": "recruiter", "label": "Recruiter / Talent Acquisition"},
            {"key": "hr_team", "label": "HR Team / Manager"},
            {"key": "company_founder", "label": "Company Founder / Executive"},
            {"key": "hiring_manager", "label": "Hiring Manager"},
            {"key": "educator", "label": "Educator / Placement Officer"},
            {"key": "other", "label": "Other"},
        ],
        "intent_options": [
            {"key": "find_first_job", "label": "Find my first job or internship"},
            {"key": "switch_careers", "label": "Switch to a new career domain"},
            {"key": "improve_resume", "label": "Improve my resume and ATS score"},
            {
                "key": "prepare_interviews",
                "label": "Prepare for technical & HR interviews",
            },
            {
                "key": "identify_skills",
                "label": "Identify skill gaps and what to learn",
            },
            {
                "key": "track_applications",
                "label": "Organize and track job applications",
            },
            {
                "key": "discover_genuine_jobs",
                "label": "Discover genuine, verified job listings",
            },
            {"key": "hire_talent", "label": "Hire skilled candidates & freshers"},
            {"key": "post_job_opportunities", "label": "Post verified job openings"},
            {
                "key": "understand_market_demand",
                "label": "Understand current hiring signals & market demand",
            },
            {
                "key": "share_feedback",
                "label": "Share product feedback to help shape Saarthi AI",
            },
            {
                "key": "explore_higher_studies",
                "label": "Explore higher education & graduate tools",
            },
            {"key": "other", "label": "Other career or hiring intent"},
        ],
        "challenge_areas": [
            {
                "key": "finding_relevant_jobs",
                "label": "Finding relevant jobs matching my background",
            },
            {
                "key": "finding_genuine_opportunities",
                "label": "Filtering genuine opportunities from ghost/spam posts",
            },
            {
                "key": "understanding_jds",
                "label": "Understanding complex Job Descriptions",
            },
            {
                "key": "knowing_qualification",
                "label": "Knowing if I am actually qualified before applying",
            },
            {
                "key": "resume_improvement",
                "label": "Tailoring my resume for ATS screening",
            },
            {
                "key": "skill_gap_identification",
                "label": "Identifying specific skill gaps for target roles",
            },
            {
                "key": "interview_preparation",
                "label": "Preparing effectively for interviews",
            },
            {
                "key": "finding_companies",
                "label": "Finding top companies hiring in my domain",
            },
            {
                "key": "tracking_applications",
                "label": "Keeping track of multiple job applications",
            },
            {
                "key": "knowing_what_to_learn",
                "label": "Deciding what skills to learn next",
            },
        ],
        "feature_count": 34,
    }
