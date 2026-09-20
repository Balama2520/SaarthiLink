from fastapi import Depends
from app.core.dependencies.repositories import (
    get_goal_repository,
    get_roadmap_repository,
    get_resume_repository,
    get_jobs_repository,
    get_interview_repository,
    get_career_repository,
    get_user_repository,
)
from app.repositories.goal_repository import GoalRepository
from app.repositories.roadmap_repository import RoadmapRepository
from app.repositories.resume_repository import ResumeRepository
from app.repositories.jobs_repository import JobsRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.career_repository import CareerRepository
from app.repositories.user_repository import UserRepository

from app.services.goal_service import GoalService
from app.services.roadmap_service import RoadmapService
from app.services.resume_service import ResumeService
from app.services.jobs_service import JobsService
from app.services.interview_service import InterviewService
from app.services.career_service import CareerService
from app.services.auth_service import AuthService


def get_goal_service(
    repo: GoalRepository = Depends(get_goal_repository),
) -> GoalService:
    return GoalService(repo)


def get_roadmap_service(
    repo: RoadmapRepository = Depends(get_roadmap_repository),
) -> RoadmapService:
    return RoadmapService(repo)


def get_resume_service(
    repo: ResumeRepository = Depends(get_resume_repository),
) -> ResumeService:
    return ResumeService(repo)


def get_jobs_service(
    repo: JobsRepository = Depends(get_jobs_repository),
) -> JobsService:
    return JobsService(repo)


def get_interview_service(
    repo: InterviewRepository = Depends(get_interview_repository),
) -> InterviewService:
    return InterviewService(repo)


def get_career_service(
    repo: CareerRepository = Depends(get_career_repository),
) -> CareerService:
    return CareerService(repo)


def get_auth_service(
    repo: UserRepository = Depends(get_user_repository),
) -> AuthService:
    return AuthService(repo)
