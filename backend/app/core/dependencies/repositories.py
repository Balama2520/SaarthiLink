from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repositories.goal_repository import GoalRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.workspace_file_repository import WorkspaceFileRepository
from app.repositories.research_repository import ResearchRepository
from app.repositories.roadmap_repository import RoadmapRepository
from app.repositories.resume_repository import ResumeRepository
from app.repositories.jobs_repository import JobsRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.career_repository import CareerRepository

def get_goal_repository(db: Session = Depends(get_db)) -> GoalRepository:
    return GoalRepository(db)

def get_chat_repository(db: Session = Depends(get_db)) -> ChatRepository:
    return ChatRepository(db)

def get_memory_repository(db: Session = Depends(get_db)) -> MemoryRepository:
    return MemoryRepository(db)

def get_workspace_repository(db: Session = Depends(get_db)) -> WorkspaceRepository:
    return WorkspaceRepository(db)

def get_workspace_file_repository(db: Session = Depends(get_db)) -> WorkspaceFileRepository:
    return WorkspaceFileRepository(db)

def get_research_repository(db: Session = Depends(get_db)) -> ResearchRepository:
    return ResearchRepository(db)

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
