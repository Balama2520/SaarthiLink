from fastapi import Depends
from app.core.dependencies.repositories import (
    get_goal_repository, get_chat_repository, get_memory_repository,
    get_workspace_repository, get_workspace_file_repository,
    get_research_repository, get_roadmap_repository,
    get_resume_repository, get_jobs_repository,
    get_interview_repository, get_career_repository,
    get_user_repository, get_project_repository,
    get_admin_repository, get_note_repository, get_gradhub_repository,
    get_higher_studies_repository, get_experiment_repository
)
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
from app.repositories.user_repository import UserRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.admin_repository import AdminRepository
from app.repositories.note_repository import NoteRepository
from app.repositories.gradhub_repository import GradhubRepository
from app.repositories.higher_studies_repository import HigherStudiesRepository
from app.repositories.experiment_repository import ExperimentRepository

from app.services.goal_service import GoalService
from app.services.chat_service import ChatService
from app.services.memory_service import MemoryService
from app.services.workspace_service import WorkspaceService
from app.services.workspace_file_service import WorkspaceFileService
from app.services.research_service import ResearchService
from app.services.roadmap_service import RoadmapService
from app.services.resume_service import ResumeService
from app.services.jobs_service import JobsService
from app.services.interview_service import InterviewService
from app.services.career_service import CareerService
from app.services.auth_service import AuthService
from app.services.project_service import ProjectService
from app.services.admin_service import AdminService
from app.services.note_service import NoteService
from app.services.gradhub_service import GradhubService
from app.services.higher_studies_service import HigherStudiesService
from app.services.experiment_service import ExperimentService

def get_goal_service(repo: GoalRepository = Depends(get_goal_repository)) -> GoalService:
    return GoalService(repo)

def get_chat_service(repo: ChatRepository = Depends(get_chat_repository)) -> ChatService:
    return ChatService(repo)

def get_memory_service(repo: MemoryRepository = Depends(get_memory_repository)) -> MemoryService:
    return MemoryService(repo)

def get_workspace_service(
    repo: WorkspaceRepository = Depends(get_workspace_repository),
    file_repo: WorkspaceFileRepository = Depends(get_workspace_file_repository)
) -> WorkspaceService:
    return WorkspaceService(repo, file_repo)

def get_workspace_file_service(
    repo: WorkspaceRepository = Depends(get_workspace_repository),
    file_repo: WorkspaceFileRepository = Depends(get_workspace_file_repository)
) -> WorkspaceFileService:
    return WorkspaceFileService(repo, file_repo)

def get_research_service(
    repo: ResearchRepository = Depends(get_research_repository)
) -> ResearchService:
    return ResearchService(repo)

def get_roadmap_service(
    repo: RoadmapRepository = Depends(get_roadmap_repository)
) -> RoadmapService:
    return RoadmapService(repo)

def get_resume_service(
    repo: ResumeRepository = Depends(get_resume_repository)
) -> ResumeService:
    return ResumeService(repo)

def get_jobs_service(
    repo: JobsRepository = Depends(get_jobs_repository)
) -> JobsService:
    return JobsService(repo)

def get_interview_service(
    repo: InterviewRepository = Depends(get_interview_repository)
) -> InterviewService:
    return InterviewService(repo)

def get_career_service(
    repo: CareerRepository = Depends(get_career_repository)
) -> CareerService:
    return CareerService(repo)

def get_auth_service(
    repo: UserRepository = Depends(get_user_repository)
) -> AuthService:
    return AuthService(repo)

def get_project_service(repo: ProjectRepository = Depends(get_project_repository)) -> ProjectService:
    return ProjectService(repo)

def get_admin_service(repo: AdminRepository = Depends(get_admin_repository)) -> AdminService:
    return AdminService(repo)

def get_note_service(repo: NoteRepository = Depends(get_note_repository)) -> NoteService:
    return NoteService(repo)

def get_gradhub_service(repo: GradhubRepository = Depends(get_gradhub_repository)) -> GradhubService:
    return GradhubService(repo)

def get_higher_studies_service(repo: HigherStudiesRepository = Depends(get_higher_studies_repository)) -> HigherStudiesService:
    return HigherStudiesService(repo)

def get_experiment_service(repo: ExperimentRepository = Depends(get_experiment_repository)) -> ExperimentService:
    return ExperimentService(repo)

def save_message_background(session_id: str, role: str, content: str):
    from app.core.dependencies.database import get_db_context
    with get_db_context() as db:
        repo = MemoryRepository(db)
        service = MemoryService(repo)
        service.add_message(session_id, role, content)
