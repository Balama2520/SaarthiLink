from fastapi import Depends
from app.core.dependencies.repositories import get_goal_repository, get_chat_repository, get_memory_repository
from app.repositories.goal_repository import GoalRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.memory_repository import MemoryRepository

from app.services.goal_service import GoalService
from app.services.chat_service import ChatService
from app.services.memory_service import MemoryService

def get_goal_service(repo: GoalRepository = Depends(get_goal_repository)) -> GoalService:
    return GoalService(repo)

def get_chat_service(repo: ChatRepository = Depends(get_chat_repository)) -> ChatService:
    return ChatService(repo)

def get_memory_service(repo: MemoryRepository = Depends(get_memory_repository)) -> MemoryService:
    return MemoryService(repo)

def save_message_background(session_id: str, role: str, content: str):
    from app.core.dependencies.database import get_db_context
    with get_db_context() as db:
        repo = MemoryRepository(db)
        service = MemoryService(repo)
        service.add_message(session_id, role, content)
