"""
Pydantic schemas for the Job Ecosystem module.
Used for strict request/response validation on all job-related API endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

# ---------------------------------------------------------------------------
# Company Schemas
# ---------------------------------------------------------------------------


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    headquarters: Optional[str] = None
    website: Optional[str] = None
    careers_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_hiring: Optional[bool] = True


class CompanyOut(CompanyBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Job Skill Schemas
# ---------------------------------------------------------------------------


class JobSkillOut(BaseModel):
    skill_name: str
    is_required: bool

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Job Schemas
# ---------------------------------------------------------------------------


class JobBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None  # Internship, Full-time
    employment_type: Optional[str] = None  # On-site, Remote, Hybrid
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience_required: Optional[str] = None
    apply_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class JobOut(JobBase):
    id: str
    status: str
    company: CompanyOut
    skills: list[JobSkillOut] = []
    posted_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobListOut(BaseModel):
    """List view containing fields needed by search, filters, and Match IQ."""

    id: str
    title: str
    description: Optional[str]
    location: Optional[str]
    job_type: Optional[str]
    employment_type: Optional[str]
    remote_type: Optional[str]
    status: str
    salary_min: Optional[int]
    salary_max: Optional[int]
    experience_required: Optional[str]
    apply_url: Optional[str]
    posted_at: datetime
    company: CompanyOut
    skills: list[JobSkillOut] = []

    model_config = ConfigDict(from_attributes=True)


class JobIngestItem(BaseModel):
    """Normalized job payload accepted from Sheets and other feed adapters."""

    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field("Remote", max_length=255)
    country: Optional[str] = Field(None, max_length=100)
    remote_type: Optional[str] = Field(None, max_length=50)
    employment_type: Optional[str] = Field(None, max_length=50)
    job_type: Optional[str] = Field("Full-time", max_length=50)
    experience_required: Optional[str] = Field(None, max_length=50)
    experience_min: Optional[int] = Field(None, ge=0)
    experience_max: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_currency: Optional[str] = Field(None, max_length=8)
    apply_url: Optional[str] = None
    source_url: Optional[str] = None
    company_url: Optional[str] = None
    source_job_id: Optional[str] = Field(None, max_length=255)
    fingerprint: Optional[str] = Field(None, min_length=64, max_length=64)
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    skills: list[str] = []


class JobIngestBatchRequest(BaseModel):
    source: str = Field("GoogleSheets", min_length=1, max_length=100)
    source_id: Optional[str] = Field(None, max_length=100)
    run_id: Optional[str] = Field(None, max_length=100)
    jobs: list[JobIngestItem] = Field(..., min_length=1, max_length=200)


class JobIngestResponse(BaseModel):
    status: str
    source: str
    processed: int
    inserted: int
    updated: int
    duplicates: int
    errors: int = 0
    failed_ids: list[str] = []


# ---------------------------------------------------------------------------
# Recommendation Schemas
# ---------------------------------------------------------------------------


class JobRecommendationOut(BaseModel):
    """Extends JobListOut with a recommendation score."""

    job: JobListOut
    match_score: int = Field(..., ge=0, le=100, description="0-100 skill match percentage")
    matched_skills: list[str] = []
    missing_skills: list[str] = []


# ---------------------------------------------------------------------------
# Job Search
# ---------------------------------------------------------------------------


class JobSearchParams(BaseModel):
    q: Optional[str] = None  # Free-text search on title
    location: Optional[str] = None
    job_type: Optional[str] = None
    remote_type: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


# ---------------------------------------------------------------------------
# Saved Job Schemas
# ---------------------------------------------------------------------------


class SaveJobRequest(BaseModel):
    job_id: str = Field(..., min_length=1)


class SavedJobOut(BaseModel):
    job_id: str
    saved_at: datetime
    job: JobListOut

    model_config = ConfigDict(from_attributes=True)
