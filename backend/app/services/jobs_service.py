import json
import logging
from fastapi import HTTPException
from typing import List, Optional
from app.repositories.jobs_repository import JobsRepository
from app.models.models import JobApplication, Job, SavedJob
from app.schemas.jobs import JobRecommendationOut, JobListOut, JobSkillOut, CompanyOut
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


async def _collect_stream(stream) -> str:
    full = ""
    async for chunk in stream:
        full += chunk
    return full


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


class JobsService:
    def __init__(self, repo: JobsRepository):
        self.repo = repo

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.repo.get_job_by_id(job_id)

    def list_jobs(self, skip: int = 0, limit: int = 20) -> List[Job]:
        return self.repo.list_jobs(skip, limit)

    def search_jobs(
        self,
        q: Optional[str] = None,
        location: Optional[str] = None,
        job_type: Optional[str] = None,
        remote_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Job]:
        return self.repo.search_jobs(q, location, job_type, remote_type, skip, limit)

    def get_recommended_jobs(
        self, user_id: int, skip: int = 0, limit: int = 20
    ) -> List[JobRecommendationOut]:
        from app.models.models import UserProfile
        import json

        # 1. Fetch user profile preferences
        profile = (
            self.repo.db.query(UserProfile)
            .filter(UserProfile.user_id == user_id)
            .first()
        )
        pref_locations = set()
        work_prefs = set()
        if profile:
            try:
                if profile.preferred_locations_json:
                    pref_locations = set(json.loads(profile.preferred_locations_json))
                if profile.work_preferences_json:
                    work_prefs = set(
                        [p.lower() for p in json.loads(profile.work_preferences_json)]
                    )
            except:
                pass

        # 2. Fetch user skills
        user_skills_db = self.repo.get_user_skills(user_id)
        user_skill_names = {s.skill_name.lower() for s in user_skills_db}

        # 3. Fetch active jobs
        active_jobs = self.repo.list_jobs(0, 200)

        # 4. Score jobs based on skill overlap + profile preferences
        recommendations = []
        for job in active_jobs:
            # Filter by work preferences if strictly specified
            job_remote = job.remote_type.lower() if job.remote_type else ""
            if work_prefs and (
                "remote" in work_prefs
                or "hybrid" in work_prefs
                or "onsite" in work_prefs
            ):
                # Basic preference check (soft filter, we'll just penalize score if mismatch)
                pass

            job_skills = {s.skill_name.lower() for s in job.skills}

            matched = job_skills.intersection(user_skill_names)
            missing = job_skills.difference(user_skill_names)

            match_score = 0
            if job_skills:
                match_score = int((len(matched) / len(job_skills)) * 100)
            else:
                match_score = 50

            # Bonus points for location match
            if pref_locations and job.location and job.location in pref_locations:
                match_score = min(100, match_score + 10)

            # Bonus points for work preference match
            if work_prefs and job_remote in work_prefs:
                match_score = min(100, match_score + 10)

            job_list_out = JobListOut.model_validate(job)

            rec = JobRecommendationOut(
                job=job_list_out,
                match_score=match_score,
                matched_skills=list(matched),
                missing_skills=list(missing),
            )
            recommendations.append(rec)

        # 5. Sort by score descending and apply pagination
        recommendations.sort(key=lambda r: r.match_score, reverse=True)
        return recommendations[skip : skip + limit]

    def save_job(self, user_id: int, job_id: str) -> SavedJob:
        job = self.repo.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return self.repo.save_job(user_id, job_id)

    def get_saved_jobs(self, user_id: int) -> List[SavedJob]:
        return self.repo.get_saved_jobs(user_id)

    def unsave_job(self, user_id: int, job_id: str) -> dict:
        success = self.repo.unsave_job(user_id, job_id)
        if not success:
            raise HTTPException(status_code=404, detail="Saved job not found")
        return {"status": "unsaved", "job_id": job_id}

    def track_application(self, user_id: int, job_id: str) -> JobApplication:
        """Create or promote a user-scoped application record for a real job."""
        job = self.repo.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        application = (
            self.repo.db.query(JobApplication)
            .filter(
                JobApplication.user_id == user_id,
                JobApplication.job_title == job.title,
                JobApplication.company == job.company.name,
            )
            .first()
        )
        if application:
            application.status = "applied"
        else:
            application = JobApplication(
                user_id=user_id,
                job_title=job.title,
                company=job.company.name,
                description=job.description,
                status="applied",
            )
            self.repo.db.add(application)
        self.repo.db.commit()
        self.repo.db.refresh(application)
        return application

    async def match_job(
        self,
        user_id: int,
        resume_text: str,
        job_description: str,
        company_name: str,
        job_title: str,
    ) -> dict:
        prompt = PromptManager.load(
            "jobs/match_job",
            job_title=job_title,
            company_name=company_name,
            resume_text=resume_text[:3000],
            job_description=job_description[:3000],
        )
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            if user_id != -1:
                # Store it as an application context (for the existing flow)
                db_job = JobApplication(
                    user_id=user_id,
                    company=company_name,
                    job_title=job_title,
                    match_percentage=parsed_data.get("match_percentage", 0),
                    missing_skills=json.dumps(parsed_data.get("missing_skills", [])),
                    status="analyzed",
                )
                self.repo.db.add(db_job)
                self.repo.db.commit()

            return parsed_data

        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_text}")
            raise HTTPException(
                status_code=500, detail="Failed to match job. Please try again."
            )
