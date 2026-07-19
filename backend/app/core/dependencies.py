from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repositories.goal_repository import GoalRepository
from app.services.goal_service import GoalService

def get_goal_service(db: Session = Depends(get_db)) -> GoalService:
    return GoalService(GoalRepository(db))
