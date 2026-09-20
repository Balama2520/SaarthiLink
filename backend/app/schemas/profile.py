from typing import Optional, List, Dict, Any
from pydantic import BaseModel, HttpUrl, field_validator


class ProfileUpdate(BaseModel):
    headline: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None

    degree: Optional[str] = None
    branch: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None

    career_stage: Optional[str] = None
    target_role: Optional[str] = None
    background_summary: Optional[str] = None

    preferred_domains: Optional[List[str]] = None
    preferred_industries: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    salary_expectations: Optional[str] = None
    work_authorization: Optional[str] = None
    work_preferences: Optional[List[str]] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    timezone: Optional[str] = None

    soft_skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certifications: Optional[List[str]] = None

    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    leetcode_url: Optional[str] = None
    hackerrank_url: Optional[str] = None

    @field_validator("cgpa", mode="before")
    @classmethod
    def validate_cgpa(cls, v):
        if v is not None and (v < 0.0 or v > 10.0):
            raise ValueError("CGPA must be between 0 and 10")
        return v

    @field_validator("graduation_year", mode="before")
    @classmethod
    def validate_grad_year(cls, v):
        if v is not None and (v < 1900 or v > 2100):
            raise ValueError("Graduation year is out of bounds")
        return v


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None

    headline: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None

    degree: Optional[str] = None
    branch: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None

    career_stage: Optional[str] = None
    target_role: Optional[str] = None
    background_summary: Optional[str] = None
    preferred_domains: Optional[List[str]] = None
    preferred_industries: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    salary_expectations: Optional[str] = None
    work_authorization: Optional[str] = None
    work_preferences: Optional[List[str]] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    timezone: Optional[str] = None

    soft_skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certifications: Optional[List[str]] = None

    technical_skills: Optional[List[Dict[str, Any]]] = None

    current_resume_id: Optional[int] = None
    resume_version: Optional[int] = None
    resume_ats_score: Optional[int] = None
    resume_last_parsed: Optional[Any] = None

    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    leetcode_url: Optional[str] = None
    hackerrank_url: Optional[str] = None

    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class ProfileCompletenessResponse(BaseModel):
    overall_percentage: int
    sections: Dict[str, int]
    suggestions: List[str]


class ProfileSummaryResponse(BaseModel):
    summary_text: str
