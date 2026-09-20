import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.models import UserProfile, User, UserSkill
from app.schemas.profile import (
    ProfileUpdate,
    ProfileResponse,
    ProfileCompletenessResponse,
    ProfileSummaryResponse,
)
from app.core.dependencies.auth import get_current_user, require_authenticated_user
from app.services.career_copilot_service import CareerCopilotService

router = APIRouter(prefix="/profile", tags=["profile"])


def _parse_json_field(val: Any) -> List[str]:
    if not val:
        return []
    if isinstance(val, str):
        try:
            return json.loads(val)
        except:
            return []
    return val


def _build_profile_response(profile: UserProfile, db: Session) -> dict:
    # Ensure owner exists
    full_name = profile.owner.full_name if profile.owner else None
    email = profile.owner.email if profile.owner else None

    # Fetch technical skills from UserSkill
    user_skills = db.query(UserSkill).filter(UserSkill.user_id == profile.user_id).all()
    technical_skills = [
        {"skill_name": s.skill_name, "proficiency": s.proficiency, "source": s.source}
        for s in user_skills
    ]

    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": full_name,
        "email": email,
        "headline": profile.headline,
        "phone": profile.phone,
        "profile_photo_url": profile.profile_photo_url,
        "degree": profile.degree,
        "branch": profile.branch,
        "college": profile.college,
        "university": profile.university,
        "graduation_year": profile.graduation_year,
        "cgpa": profile.cgpa,
        "career_stage": profile.career_stage,
        "target_role": profile.target_role,
        "background_summary": profile.background_summary,
        "preferred_domains": _parse_json_field(profile.preferred_domains_json),
        "preferred_industries": _parse_json_field(profile.preferred_industries_json),
        "preferred_locations": _parse_json_field(profile.preferred_locations_json),
        "salary_expectations": profile.salary_expectations,
        "work_authorization": profile.work_authorization,
        "work_preferences": _parse_json_field(profile.work_preferences_json),
        "notification_preferences": (
            json.loads(profile.notification_preferences_json)
            if profile.notification_preferences_json
            else {}
        ),
        "timezone": profile.timezone,
        "soft_skills": _parse_json_field(profile.soft_skills_json),
        "languages": _parse_json_field(profile.languages_json),
        "certifications": _parse_json_field(profile.certifications_json),
        "technical_skills": technical_skills,
        "current_resume_id": profile.current_resume_id,
        "resume_version": profile.resume_version,
        "resume_ats_score": profile.resume_ats_score,
        "resume_last_parsed": profile.resume_last_parsed,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "portfolio_url": profile.portfolio_url,
        "leetcode_url": profile.leetcode_url,
        "hackerrank_url": profile.hackerrank_url,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def get_or_create_profile(user_id: int, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _require_authenticated(current_user):
    """Reject GuestUser - profile requires real authentication."""
    from app.core.dependencies.auth import GuestUser

    if isinstance(current_user, GuestUser) or current_user.id == -1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access profile",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    from sqlalchemy.orm import joinedload

    profile = (
        db.query(UserProfile)
        .options(joinedload(UserProfile.owner))
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return _build_profile_response(profile, db)


@router.patch("", response_model=ProfileResponse)
def update_profile(
    updates: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    profile = get_or_create_profile(current_user.id, db)
    update_data = updates.model_dump(exclude_unset=True)

    # Handle JSON fields explicitly
    json_fields = [
        "preferred_domains",
        "preferred_industries",
        "preferred_locations",
        "work_preferences",
        "soft_skills",
        "languages",
        "certifications",
        "notification_preferences",
    ]

    for key, value in update_data.items():
        if key in json_fields:
            setattr(profile, f"{key}_json", json.dumps(value))
        else:
            setattr(profile, key, value)

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)

    # Invalidate AI cache for career copilot
    CareerCopilotService(db).invalidate_cache(current_user.id)

    return _build_profile_response(profile, db)


@router.put("", response_model=ProfileResponse)
def replace_profile(
    updates: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    # PUT replaces everything provided
    return update_profile(updates, db, current_user)


@router.get("/completeness", response_model=ProfileCompletenessResponse)
def get_completeness(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    profile = get_or_create_profile(current_user.id, db)

    sections = {
        "Personal": 0,
        "Education": 0,
        "Career": 0,
        "Resume": 0,
        "Technical Skills": 0,
        "Soft Skills": 0,
        "Portfolio": 0,
        "Preferences": 0,
    }

    suggestions = []

    # Personal (3 pts)
    if profile.phone:
        sections["Personal"] += 33
    if profile.profile_photo_url:
        sections["Personal"] += 33
    if current_user.full_name:
        sections["Personal"] += 34
    if sections["Personal"] < 100:
        suggestions.append("Complete your personal details (Phone, Photo, Name).")

    # Education (5 pts)
    edu_score = 0
    if profile.degree:
        edu_score += 20
    if profile.university:
        edu_score += 20
    if profile.graduation_year:
        edu_score += 20
    if profile.branch:
        edu_score += 20
    if profile.cgpa:
        edu_score += 20
    sections["Education"] = edu_score
    if edu_score < 100:
        suggestions.append("Complete your Education section.")

    # Career (4 pts)
    car_score = 0
    if profile.target_role:
        car_score += 25
    if profile.career_stage:
        car_score += 25
    if profile.preferred_locations_json and profile.preferred_locations_json != "[]":
        car_score += 25
    if profile.salary_expectations:
        car_score += 25
    sections["Career"] = car_score
    if car_score < 100:
        suggestions.append("Set your Career Goals (Target Role, Locations).")

    # Resume (1 pt)
    if profile.current_resume_id:
        sections["Resume"] = 100
    else:
        suggestions.append("Upload your latest Resume.")

    # Technical Skills (from UserSkill)
    ts_count = db.query(UserSkill).filter(UserSkill.user_id == current_user.id).count()
    sections["Technical Skills"] = min(100, ts_count * 20)
    if ts_count == 0:
        suggestions.append(
            "Add Technical Skills (or let AI parse them from your resume)."
        )

    # Soft Skills
    if profile.soft_skills_json and profile.soft_skills_json != "[]":
        sections["Soft Skills"] = 100
    else:
        suggestions.append("Add Soft Skills.")

    # Portfolio
    port_score = 0
    if profile.github_url:
        port_score += 50
    if profile.linkedin_url:
        port_score += 50
    sections["Portfolio"] = port_score
    if port_score < 100:
        suggestions.append("Link your GitHub and LinkedIn profiles.")

    # Preferences
    if profile.work_preferences_json and profile.work_preferences_json != "[]":
        sections["Preferences"] = 100
    else:
        suggestions.append("Set your work preferences (Remote, Hybrid, etc.).")

    overall = sum(sections.values()) // len(sections)

    return {
        "overall_percentage": overall,
        "sections": sections,
        "suggestions": suggestions[:3],  # Return top 3 suggestions
    }


@router.get("/summary", response_model=ProfileSummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    profile = get_or_create_profile(current_user.id, db)

    ts = (
        db.query(UserSkill)
        .filter(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.proficiency.desc())
        .limit(5)
        .all()
    )
    top_skills = [s.skill_name for s in ts]

    summary = f"User is at {profile.career_stage or 'unknown'} stage targeting {profile.target_role or 'general roles'}. "
    if profile.degree and profile.university:
        summary += f"Studying {profile.degree} at {profile.university}. "

    if top_skills:
        summary += f"Top tech skills: {', '.join(top_skills)}. "

    if profile.soft_skills_json and profile.soft_skills_json != "[]":
        ss = ", ".join(_parse_json_field(profile.soft_skills_json))
        summary += f"Soft skills: {ss}. "

    if profile.preferred_locations_json and profile.preferred_locations_json != "[]":
        locs = ", ".join(_parse_json_field(profile.preferred_locations_json))
        summary += f"Prefers {locs}. "

    summary += f"ATS Score: {profile.resume_ats_score}."

    return {"summary_text": summary.strip()}
