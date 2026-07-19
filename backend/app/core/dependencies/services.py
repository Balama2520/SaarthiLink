from fastapi import Depends
from app.core.dependencies.repositories import (
    get_goal_repository, get_chat_repository, get_memory_repository,
    get_workspace_repository, get_workspace_file_repository
)
from app.repositories.goal_repository import GoalRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.workspace_file_repository import WorkspaceFileRepository

from app.services.goal_service import GoalService
from app.services.chat_service import ChatService
from app.services.memory_service import MemoryService
from app.services.workspace_service import WorkspaceService
from app.services.workspace_file_service import WorkspaceFileService

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

def save_message_background(session_id: str, role: str, content: str):
    from app.core.dependencies.database import get_db_context
    with get_db_context() as db:
        repo = MemoryRepository(db)
        service = MemoryService(repo)
        service.add_message(session_id, role, content)
