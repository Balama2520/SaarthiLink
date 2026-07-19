from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.jobs_service import JobsService
from app.core.dependencies.services import get_jobs_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str
    company_name: str
    job_title: str


class JobMatchResponse(BaseModel):
    match_percentage: int
    missing_skills: list[str]
    recommendation: str


@router.post("/match", response_model=JobMatchResponse)
async def match_job(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    jobs_svc: JobsService = Depends(get_jobs_service)
):
    return await jobs_svc.match_job(
        current_user.id,
        request.resume_text,
        request.job_description,
        request.company_name,
        request.job_title
    )

