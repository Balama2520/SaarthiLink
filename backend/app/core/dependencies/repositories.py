from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repositories.goal_repository import GoalRepository
from app.repositories.roadmap_repository import RoadmapRepository
from app.repositories.resume_repository import ResumeRepository
from app.repositories.jobs_repository import JobsRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.career_repository import CareerRepository
from app.repositories.user_repository import UserRepository


def get_goal_repository(db: Session = Depends(get_db)) -> GoalRepository:
    return GoalRepository(db)


def get_roadmap_repository(db: Session = Depends(get_db)) -> RoadmapRepository:
    return RoadmapRepository(db)


def get_resume_repository(db: Session = Depends(get_db)) -> ResumeRepository:
    return ResumeRepository(db)


def get_jobs_repository(db: Session = Depends(get_db)) -> JobsRepository:
    return JobsRepository(db)


def get_interview_repository(db: Session = Depends(get_db)) -> InterviewRepository:
    return InterviewRepository(db)


def get_career_repository(db: Session = Depends(get_db)) -> CareerRepository:
    return CareerRepository(db)


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)
