from sqlalchemy.orm import Session, joinedload
from app.models.models import Goal
from typing import List, Optional

class GoalRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_user(self, user_id: int) -> List[Goal]:
        # Only return root goals (not milestones/tasks) in the main list
        return self.db.query(Goal).filter(Goal.user_id == user_id, Goal.parent_id == None).all()

    def find_by_id_and_user(self, goal_id: str, user_id: int) -> Optional[Goal]:
        return self.db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()

    def find_tree_by_id_and_user(self, goal_id: str, user_id: int) -> Optional[Goal]:
        # Fetch the goal and eagerly load its children (milestones) and their children (tasks)
        return self.db.query(Goal).options(
            joinedload(Goal.children).joinedload(Goal.children)
        ).filter(Goal.id == goal_id, Goal.user_id == user_id).first()

    def save(self, goal: Goal) -> Goal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete(self, goal: Goal) -> None:
        self.db.delete(goal)
        self.db.commit()

