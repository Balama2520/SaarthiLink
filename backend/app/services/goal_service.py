from fastapi import HTTPException
from app.repositories.goal_repository import GoalRepository
from app.models.models import Goal
from app.schemas.goal import GoalCreate, GoalUpdate
from typing import List

class GoalService:
    def __init__(self, repo: GoalRepository):
        self.repo = repo

    def get_user_goals(self, user_id: int) -> List[Goal]:
        return self.repo.find_by_user(user_id)

    def get_goal(self, goal_id: str, user_id: int) -> Goal:
        goal = self.repo.find_by_id_and_user(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal

    def create_goal(self, goal_in: GoalCreate, user_id: int) -> Goal:
        goal = Goal(
            user_id=user_id,
            title=goal_in.title,
            description=goal_in.description,
            category=goal_in.category,
            status=goal_in.status,
            priority=goal_in.priority,
            progress=goal_in.progress,
            due_date=goal_in.due_date
        )
        return self.repo.save(goal)

    def update_goal(self, goal_id: str, goal_in: GoalUpdate, user_id: int) -> Goal:
        goal = self.get_goal(goal_id, user_id)
        
        update_data = goal_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)
            
        return self.repo.save(goal)

    def delete_goal(self, goal_id: str, user_id: int) -> None:
        goal = self.get_goal(goal_id, user_id)
        self.repo.delete(goal)
