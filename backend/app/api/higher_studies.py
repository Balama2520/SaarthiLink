from fastapi import APIRouter, Depends

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.higher_studies_service import HigherStudiesService
from app.core.dependencies.services import get_higher_studies_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/admissions", tags=["Admissions"])

class UnivSearchRequest(BaseModel):
    query: str
    target_degree: Optional[str] = "MS"

@router.post("/universities")
async def find_universities(
    request: UnivSearchRequest,
    current_user: User = Depends(get_current_user),
    service: HigherStudiesService = Depends(get_higher_studies_service)
):
    """University Finder & College Comparison"""
    return await service.find_universities(request.query, request.target_degree)

@router.post("/professors")
async def find_professors(
    request: UnivSearchRequest,
    current_user: User = Depends(get_current_user),
    service: HigherStudiesService = Depends(get_higher_studies_service)
):
    """Professor & Lab Finder"""
    return await service.find_professors(request.query, request.target_degree)

@router.get("/planner")
async def get_higher_ed_plan(
    current_user: User = Depends(get_current_user),
    service: HigherStudiesService = Depends(get_higher_studies_service)
):
    """GATE/GRE planner, SOP & LOR builder status"""
    return service.get_higher_ed_plan(current_user.id)

