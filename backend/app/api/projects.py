from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.project_service import ProjectService
from app.core.dependencies.services import get_project_service

router = APIRouter(prefix="/projects", tags=["projects"])

class SkillForgeRequest(BaseModel):
    target_role: str
    current_skills: str

class SkillForgeProject(BaseModel):
    stage: str
    title: str
    description: str
    architecture: str
    roadmap: list[str]
    github_structure: str

class SkillForgeResponse(BaseModel):
    pipeline: list[SkillForgeProject]

@router.post("/generate", response_model=SkillForgeResponse)
async def generate_skillforge_pipeline(
    request: SkillForgeRequest,
    current_user: User = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    return await project_service.generate_skillforge_pipeline(
        user_id=current_user.id,
        target_role=request.target_role,
        current_skills=request.current_skills
    )
