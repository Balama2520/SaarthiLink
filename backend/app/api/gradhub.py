from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.gradhub_service import GradhubService
from app.core.dependencies.services import get_gradhub_service

router = APIRouter(prefix="/gradhub", tags=["gradhub"])

# --- Schemas ---
class DegreeCreate(BaseModel):
    semester: int
    course_name: str
    credits: int
    gpa: Optional[str] = None
    status: Optional[str] = "planned"

class CertCreate(BaseModel):
    name: str
    provider: str
    target_date: Optional[str] = None
    status: Optional[str] = "planned"

class PlacementCreate(BaseModel):
    company: str
    role: str
    rounds_json: Optional[str] = "[]"
    package: Optional[str] = None
    status: Optional[str] = "eligible"

class ProfileOptimizeRequest(BaseModel):
    profile_text: str
    target_role: Optional[str] = "Software Engineer"

# --- Routes ---

# 1. Degree Tracker
@router.post("/degree")
async def add_degree_course(
    request: DegreeCreate,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    course_id = gradhub_service.add_degree_course(
        current_user.id, request.semester, request.course_name, 
        request.credits, request.gpa, request.status
    )
    return {"status": "success", "id": course_id}

@router.get("/degree")
async def list_degree_courses(
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    return gradhub_service.list_degree_courses(current_user.id)

@router.delete("/degree/{id}")
async def delete_degree_course(
    id: str,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    gradhub_service.delete_degree_course(current_user.id, id)
    return {"status": "deleted"}


# 2. Certification Planner
@router.post("/certs")
async def add_cert(
    request: CertCreate,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    cert_id = gradhub_service.add_cert(
        current_user.id, request.name, request.provider, 
        request.target_date, request.status
    )
    return {"status": "success", "id": cert_id}

@router.get("/certs")
async def list_certs(
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    return gradhub_service.list_certs(current_user.id)

@router.delete("/certs/{id}")
async def delete_cert(
    id: str,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    gradhub_service.delete_cert(current_user.id, id)
    return {"status": "deleted"}


# 3. Campus Placement Tracker
@router.post("/placements")
async def add_placement(
    request: PlacementCreate,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    p_id = gradhub_service.add_placement(
        current_user.id, request.company, request.role, 
        request.rounds_json, request.package, request.status
    )
    return {"status": "success", "id": p_id}

@router.get("/placements")
async def list_placements(
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    return gradhub_service.list_placements(current_user.id)

@router.delete("/placements/{id}")
async def delete_placement(
    id: str,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    gradhub_service.delete_placement(current_user.id, id)
    return {"status": "deleted"}


# 4. AI-Powered Portfolio, GitHub, and LinkedIn Optimizers
@router.post("/github-review")
async def github_review(
    request: ProfileOptimizeRequest,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    return await gradhub_service.github_review(request.profile_text, request.target_role)

@router.post("/linkedin-optimize")
async def linkedin_optimize(
    request: ProfileOptimizeRequest,
    current_user: User = Depends(get_current_user),
    gradhub_service: GradhubService = Depends(get_gradhub_service)
):
    return await gradhub_service.linkedin_optimize(request.profile_text, request.target_role)
