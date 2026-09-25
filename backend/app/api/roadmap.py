from fastapi import APIRouter, Depends
from typing import Literal
from pydantic import BaseModel, Field

from app.core.dependencies.auth import (
    get_optional_current_user,
    require_authenticated_user,
)
from app.models.models import User
from app.services.roadmap_service import RoadmapService
from app.core.dependencies.services import get_roadmap_service

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class RoadmapRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=120)
    duration_days: Literal[30, 90] = 30


class RoadmapMilestone(BaseModel):
    day_range: str
    topic: str
    tasks: list[str]
    course_url: str = ""
    estimated_hours: int = 0
    completed_task_ids: list[int] = []


class RoadmapResponse(BaseModel):
    roadmap_id: str | None = None
    target_role: str
    duration_days: int
    milestones: list[RoadmapMilestone]


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    current_user: User | None = Depends(get_optional_current_user),
    roadmap_svc: RoadmapService = Depends(get_roadmap_service),
):
    user_id = current_user.id if current_user else -1
    return await roadmap_svc.generate_roadmap(
        user_id, request.target_role, request.duration_days
    )


@router.get("/saved", response_model=list[RoadmapResponse])
def list_saved_roadmaps(
    current_user: User = Depends(require_authenticated_user),
    roadmap_svc: RoadmapService = Depends(get_roadmap_service),
):
    """Return the current user's saved roadmaps, newest first."""
    return roadmap_svc.list_roadmaps(current_user.id)


class ProgressRequest(BaseModel):
    milestone_index: int = Field(ge=0)
    task_index: int = Field(ge=0)
    completed: bool


@router.patch("/{roadmap_id}/progress")
def update_progress(
    roadmap_id: str,
    request: ProgressRequest,
    current_user: User = Depends(require_authenticated_user),
    roadmap_svc: RoadmapService = Depends(get_roadmap_service),
):
    """Persist a roadmap task completion for its owner."""
    return roadmap_svc.update_progress(
        current_user.id,
        roadmap_id,
        request.milestone_index,
        request.task_index,
        request.completed,
    )
