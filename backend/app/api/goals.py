from fastapi import APIRouter, Depends, status

from typing import List


from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User
from app.schemas.goal import (
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    GoalTreeResponse,
    MilestoneCreate,
    TaskCreate,
)
from app.services.goal_service import GoalService
from app.core.dependencies.services import get_goal_service

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.create_goal(goal_in, current_user.id)


@router.get("/", response_model=List[GoalResponse])
def get_goals(
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.get_user_goals(current_user.id)


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: str,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.get_goal(goal_id, current_user.id)


@router.get("/{goal_id}/tree", response_model=GoalTreeResponse)
def get_goal_tree(
    goal_id: str,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.get_goal_tree(goal_id, current_user.id)


@router.post(
    "/{goal_id}/milestones",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_milestone(
    goal_id: str,
    milestone_in: MilestoneCreate,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.add_milestone(goal_id, milestone_in, current_user.id)


@router.post(
    "/milestones/{milestone_id}/tasks",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_task(
    milestone_id: str,
    task_in: TaskCreate,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.add_task(milestone_id, task_in, current_user.id)


@router.post("/{goal_id}/plan")
async def generate_ai_plan(
    goal_id: str,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return await service.generate_ai_plan(goal_id, current_user.id)


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: str,
    goal_in: GoalUpdate,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    return service.update_goal(goal_id, goal_in, current_user.id)


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: str,
    current_user: User = Depends(require_authenticated_user),
    service: GoalService = Depends(get_goal_service),
):
    service.delete_goal(goal_id, current_user.id)
    return {"message": "Goal deleted successfully"}
