from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.database.connection import get_db
from app.repositories.project_repository import ProjectRepository
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(ProjectRepository(db))


class SkillForgeBody(BaseModel):
    target_role: str
    current_skills: str


@router.post("/generate")
async def generate_pipeline(
    body: SkillForgeBody,
    current_user: User = Depends(get_current_user),
    svc: ProjectService = Depends(_get_service),
):
    return await svc.generate_skillforge_pipeline(current_user.id, body.target_role, body.current_skills)
