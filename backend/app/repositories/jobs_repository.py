from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional, List
from app.models.models import Job, SavedJob, UserSkill


class JobsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_job_by_id(self, job_id: str) -> Optional[Job]:
        return (
            self.db.query(Job)
            .options(joinedload(Job.company), joinedload(Job.skills))
            .filter(Job.id == job_id)
            .first()
        )

    def list_jobs(self, skip: int = 0, limit: int = 20) -> List[Job]:
        return (
            self.db.query(Job)
            .options(joinedload(Job.company), joinedload(Job.skills))
            .filter(Job.status == "ACTIVE")
            .order_by(desc(Job.posted_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search_jobs(
        self,
        q: Optional[str] = None,
        location: Optional[str] = None,
        experience: Optional[str] = None,
        job_type: Optional[str] = None,
        remote_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Job]:
        query = (
            self.db.query(Job)
            .options(joinedload(Job.company), joinedload(Job.skills))
            .filter(Job.status == "ACTIVE")
        )

        if q:
            query = query.filter(Job.title.ilike(f"%{q}%"))
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))
        if experience:
            query = query.filter(Job.experience_required.ilike(f"%{experience}%"))
        if job_type:
            query = query.filter(Job.job_type == job_type)
        if remote_type:
            query = query.filter(Job.remote_type == remote_type)

        return query.order_by(desc(Job.posted_at)).offset(skip).limit(limit).all()

    def get_saved_jobs(self, user_id: int) -> List[SavedJob]:
        return (
            self.db.query(SavedJob)
            .options(
                joinedload(SavedJob.job).joinedload(Job.company),
                joinedload(SavedJob.job).joinedload(Job.skills),
            )
            .filter(SavedJob.user_id == user_id)
            .order_by(desc(SavedJob.saved_at))
            .all()
        )

    def save_job(self, user_id: int, job_id: str) -> SavedJob:
        existing = (
            self.db.query(SavedJob).filter_by(user_id=user_id, job_id=job_id).first()
        )
        if existing:
            return existing
        saved_job = SavedJob(user_id=user_id, job_id=job_id)
        self.db.add(saved_job)
        self.db.commit()
        self.db.refresh(saved_job)
        return saved_job

    def unsave_job(self, user_id: int, job_id: str) -> bool:
        saved = (
            self.db.query(SavedJob).filter_by(user_id=user_id, job_id=job_id).first()
        )
        if not saved:
            return False
        self.db.delete(saved)
        self.db.commit()
        return True

    def get_user_skills(self, user_id: int) -> List[UserSkill]:
        return self.db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
