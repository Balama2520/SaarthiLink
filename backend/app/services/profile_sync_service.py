import logging
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import UserProfile, UserSkill
from typing import List

logger = logging.getLogger(__name__)


class ProfileSyncService:
    def __init__(self):
        # A static dictionary mapping common synonyms to a normalized form
        self.skill_synonyms = {
            "js": "JavaScript",
            "node": "Node.js",
            "nodejs": "Node.js",
            "reactjs": "React",
            "py": "Python",
            "ts": "TypeScript",
            "html5": "HTML",
            "css3": "CSS",
            "aws": "Amazon Web Services",
            "gcp": "Google Cloud Platform",
        }

    def normalize_skills(self, skills: List[str]) -> List[str]:
        """Hybrid approach: static dictionary, leaving unknown skills as is."""
        normalized = []
        for skill in skills:
            clean_skill = skill.strip()
            lower_skill = clean_skill.lower()
            if lower_skill in self.skill_synonyms:
                clean_skill = self.skill_synonyms[lower_skill]
            if clean_skill not in normalized:
                normalized.append(clean_skill)
        return normalized

    def sync_profile(
        self,
        db: Session,
        user_id: int,
        parsed_data: dict,
        resume_id: str | None = None,
        resume_version: int | None = None,
        target_role: str | None = None,
    ) -> None:
        """
        Merge parsed data into UserProfile and UserSkill.
        In a real flow, this is called after user confirmation.
        """
        # 1. Update UserProfile
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id)
            db.add(profile)

        # Merge logic (only overwrite if empty, or based on user confirmation UI)
        # We will assume this is called with the user's explicit accepted fields.
        if parsed_data.get("personal_info"):
            if not profile.phone and parsed_data["personal_info"].get("phone"):
                profile.phone = parsed_data["personal_info"]["phone"]

        if target_role and not profile.target_role:
            profile.target_role = target_role

        if parsed_data.get("summary") and not profile.background_summary:
            profile.background_summary = parsed_data["summary"]

        if parsed_data.get("links"):
            if not profile.github_url and parsed_data["links"].get("github"):
                profile.github_url = parsed_data["links"]["github"]
            if not profile.linkedin_url and parsed_data["links"].get("linkedin"):
                profile.linkedin_url = parsed_data["links"]["linkedin"]
            if not profile.portfolio_url and parsed_data["links"].get("portfolio"):
                profile.portfolio_url = parsed_data["links"]["portfolio"]

        if parsed_data.get("education") and len(parsed_data["education"]) > 0:
            edu = parsed_data["education"][0]
            if not profile.degree and edu.get("degree"):
                profile.degree = edu["degree"]
            if not profile.university and edu.get("university"):
                profile.university = edu["university"]
            if not profile.graduation_year and edu.get("graduation_year"):
                profile.graduation_year = str(edu["graduation_year"])
            if not profile.cgpa and edu.get("cgpa"):
                profile.cgpa = str(edu["cgpa"])

        if parsed_data.get("soft_skills"):
            existing_soft = json.loads(profile.soft_skills_json or "[]")
            profile.soft_skills_json = json.dumps(
                list(dict.fromkeys(existing_soft + parsed_data["soft_skills"]))
            )
        if parsed_data.get("languages"):
            existing_languages = json.loads(profile.languages_json or "[]")
            profile.languages_json = json.dumps(
                list(dict.fromkeys(existing_languages + parsed_data["languages"]))
            )
        if parsed_data.get("certifications"):
            existing_certs = json.loads(profile.certifications_json or "[]")
            profile.certifications_json = json.dumps(
                list(dict.fromkeys(existing_certs + parsed_data["certifications"]))
            )

        if resume_id:
            profile.current_resume_id = resume_id
        if resume_version is not None:
            profile.resume_version = resume_version
        if parsed_data.get("overall_ats_score") is not None:
            profile.resume_ats_score = parsed_data["overall_ats_score"]
        profile.resume_last_parsed = datetime.now(timezone.utc)

        # 2. Update UserSkill
        existing_skills = {
            sk.skill_name.lower(): sk
            for sk in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
        }

        for skill_name in parsed_data.get("tech_skills", []):
            normalized = self.normalize_skills([skill_name])[0]
            if normalized.lower() not in existing_skills:
                new_skill = UserSkill(
                    user_id=user_id,
                    skill_name=normalized,
                    proficiency=2,  # 1=Beginner … 5=Expert; resume implies at least basic
                    source="resume",
                )
                db.add(new_skill)

        db.commit()
