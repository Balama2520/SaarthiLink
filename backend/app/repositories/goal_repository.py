from sqlalchemy.orm import Session
from app.models.models import Goal
from typing import List, Optional

class GoalRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_user(self, user_id: int) -> List[Goal]:
        return self.db.query(Goal).filter(Goal.user_id == user_id).all()

    def find_by_id_and_user(self, goal_id: str, user_id: int) -> Optional[Goal]:
        return self.db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()

    def save(self, goal: Goal) -> Goal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete(self, goal: Goal) -> None:
        self.db.delete(goal)
        self.db.commit()
