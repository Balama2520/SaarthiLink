from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List

from app.auth.auth import get_current_user
from app.models.models import User
from app.services.career_service import CareerService
from app.core.dependencies.services import get_career_service

router = APIRouter(prefix="", tags=["extra_features"])


# --- Schemas ---
class StarRequest(BaseModel):
    project_or_exp: str
    description: str

class KeywordRequest(BaseModel):
    resume_text: str
    job_title: str

class CompanyRequest(BaseModel):
    company_name: str

class CodingArenaRequest(BaseModel):
    problem_title: str
    language: str
    user_code: str
    mode: str

class NetworkRequest(BaseModel):
    person_type: str
    company: str
    user_context: str

class MissionTickRequest(BaseModel):
    task_type: str

class SalaryRequest(BaseModel):
    role: str
    location: str

class GlobalPathRequest(BaseModel):
    country: str


# --- Routes ---
@router.post("/resume/star-bullets")
async def generate_star_bullets(
    request: StarRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.generate_star_bullets(request.project_or_exp, request.description)

@router.post("/resume/keywords")
async def optimize_keywords(
    request: KeywordRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.optimize_keywords(request.resume_text, request.job_title)

@router.post("/company/decode")
async def decode_company(
    request: CompanyRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.decode_company(request.company_name)

@router.post("/coding/arena")
async def coding_arena(
    request: CodingArenaRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.coding_arena(
        request.problem_title, request.language, request.user_code, request.mode
    )

@router.post("/network/builder")
async def build_network_outreach(
    request: NetworkRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.build_network_outreach(
        request.person_type, request.company, request.user_context
    )

@router.get("/mission/status")
async def get_mission_status(
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return career_svc.get_mission_status(current_user.id)

@router.post("/mission/tick")
async def tick_mission_task(
    request: MissionTickRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return career_svc.tick_mission_task(current_user.id, request.task_type)

@router.post("/salary/insight")
async def get_salary_insight(
    request: SalaryRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.get_salary_insight(request.role, request.location)

@router.post("/global/path")
async def get_global_path(
    request: GlobalPathRequest,
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.get_global_path(request.country)

@router.get("/opportunities/feed")
async def list_opportunities(
    current_user: User = Depends(get_current_user),
    career_svc: CareerService = Depends(get_career_service)
):
    return await career_svc.get_opportunities()

