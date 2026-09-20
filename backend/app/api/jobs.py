from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.core.dependencies.auth import get_current_user, require_authenticated_user
from app.models.models import User
from app.services.jobs_service import JobsService
from app.core.dependencies.services import get_jobs_service
from app.schemas.jobs import (
    JobOut,
    JobListOut,
    JobRecommendationOut,
    SavedJobOut,
    SaveJobRequest,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=List[JobListOut])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """List active jobs with pagination."""
    return jobs_svc.list_jobs(skip=skip, limit=limit)


@router.get("/search", response_model=List[JobListOut])
async def search_jobs(
    q: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    remote_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Search jobs by title, location, type, etc."""
    return jobs_svc.search_jobs(q, location, job_type, remote_type, skip, limit)


@router.get("/recommended", response_model=List[JobRecommendationOut])
async def get_recommended_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Get jobs recommended and scored based on user's parsed skills."""
    return jobs_svc.get_recommended_jobs(current_user.id, skip, limit)


@router.post("/save", response_model=SavedJobOut)
async def save_job(
    request: SaveJobRequest,
    current_user: User = Depends(require_authenticated_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Save/bookmark a job for the current user."""
    return jobs_svc.save_job(current_user.id, request.job_id)


@router.delete("/saved/{job_id}")
async def unsave_job(
    job_id: str,
    current_user: User = Depends(require_authenticated_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Remove/unsave a bookmarked job for the current user."""
    return jobs_svc.unsave_job(current_user.id, job_id)


@router.get("/saved", response_model=List[SavedJobOut])
async def get_saved_jobs(
    current_user: User = Depends(require_authenticated_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Get all saved jobs for the current user."""
    return jobs_svc.get_saved_jobs(current_user.id)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, jobs_svc: JobsService = Depends(get_jobs_service)):
    """Get full details of a specific job."""
    job = jobs_svc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str
    company_name: str
    job_title: str


class JobMatchResponse(BaseModel):
    match_percentage: int
    missing_skills: list[str]
    recommendation: str


class TrackApplicationRequest(BaseModel):
    job_id: str


@router.post("/apply")
async def track_application(
    request: TrackApplicationRequest,
    current_user: User = Depends(require_authenticated_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Persist an application event before the candidate leaves for the job source."""
    application = jobs_svc.track_application(current_user.id, request.job_id)
    return {"id": application.id, "status": application.status}


@router.post("/match", response_model=JobMatchResponse)
async def match_job(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """(Existing) AI analysis of a job description against resume text."""
    return await jobs_svc.match_job(
        current_user.id,
        request.resume_text,
        request.job_description,
        request.company_name,
        request.job_title,
    )
