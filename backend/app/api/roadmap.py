from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_optional_current_user
from app.models.models import User
from app.services.roadmap_service import RoadmapService
from app.core.dependencies.services import get_roadmap_service

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class RoadmapRequest(BaseModel):
    target_role: str
    duration_days: int = 30


class RoadmapMilestone(BaseModel):
    day_range: str
    topic: str
    tasks: list[str]


class RoadmapResponse(BaseModel):
    target_role: str
    duration_days: int
    milestones: list[RoadmapMilestone]


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    current_user: User | None = Depends(get_optional_current_user),
    roadmap_svc: RoadmapService = Depends(get_roadmap_service)
):
    user_id = current_user.id if current_user else -1
    return await roadmap_svc.generate_roadmap(
        user_id, request.target_role, request.duration_days
    )

