from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repositories.goal_repository import GoalRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.memory_repository import MemoryRepository

def get_goal_repository(db: Session = Depends(get_db)) -> GoalRepository:
    return GoalRepository(db)

def get_chat_repository(db: Session = Depends(get_db)) -> ChatRepository:
    return ChatRepository(db)

def get_memory_repository(db: Session = Depends(get_db)) -> MemoryRepository:
    return MemoryRepository(db)
