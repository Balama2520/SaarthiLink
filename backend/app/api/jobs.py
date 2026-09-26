import hashlib
import hmac
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, Query, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.dependencies.auth import get_current_user, require_authenticated_user
from app.models.models import User
from app.services.jobs_service import JobsService
from app.core.dependencies.services import get_jobs_service
from app.database.connection import get_db
from app.schemas.jobs import (
    JobOut,
    JobListOut,
    JobRecommendationOut,
    SavedJobOut,
    SaveJobRequest,
    JobIngestBatchRequest,
    JobIngestResponse,
)
from app.models.models import Company, Job, JobSkill
from app.core.config import get_settings
from sqlalchemy import func

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _verify_ingestion_credentials(
    authorization: Optional[str],
    legacy_header: Optional[str],
) -> None:
    settings = get_settings()
    configured = settings.INGEST_API_KEY or settings.INGEST_WEBHOOK_TOKEN
    if not configured:
        raise HTTPException(status_code=503, detail="Job ingestion is not configured")
    bearer = authorization.removeprefix("Bearer ").strip() if authorization else ""
    supplied = bearer or (legacy_header or "").strip()
    if not supplied or not hmac.compare_digest(supplied, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ingestion credentials"
        )


def _canonical_city(location: str) -> str:
    city = re.split(r"[,/]", location or "Remote", maxsplit=1)[0]
    return re.sub(r"\s+", " ", city).strip().lower()


def _job_fingerprint(
    company: str, title: str, location: str, source_job_id: Optional[str] = None
) -> str:
    raw = "_".join(
        (
            company.strip().lower(),
            title.strip().lower(),
            _canonical_city(location),
            (source_job_id or "").strip().lower(),
        )
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@router.get("/sync-sheets")
def sync_sheets_now(db: Session = Depends(get_db)):
    """Triggers immediate re-sync of Google Sheet 09_JOBS_STAGING board into database."""
    from scripts.seed_jobs import run_seed
    try:
        run_seed()
        total = db.query(Job).count()
        return {"status": "ok", "message": "Successfully synced live Google Sheets staging board", "total_jobs_in_db": total}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to sync sheets: {err}")


@router.post("/ingest", response_model=JobIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_jobs(
    payload: JobIngestBatchRequest,
    authorization: Optional[str] = Header(None),
    x_saarthi_ingest_token: Optional[str] = Header(None, alias="X-Saarthi-Ingest-Token"),
    db: Session = Depends(get_db),
):
    """Validate and idempotently upsert jobs from a configured ingestion source."""
    _verify_ingestion_credentials(authorization, x_saarthi_ingest_token)
    inserted = updated = duplicates = 0
    now = datetime.now(timezone.utc)

    try:
        for item in payload.jobs:
            location = (item.location or "Remote").strip() or "Remote"
            ingest_source = payload.source_id or payload.source
            fingerprint = _job_fingerprint(item.company, item.title, location, item.source_job_id)
            existing_query = db.query(Job)
            if item.source_job_id:
                existing_query = existing_query.filter(
                    Job.source == ingest_source,
                    Job.source_job_id == item.source_job_id,
                )
            else:
                existing_query = existing_query.filter(Job.dedup_hash == fingerprint)
            existing = existing_query.first()
            if existing:
                existing.description = item.description or existing.description
                existing.location = location
                existing.job_type = item.job_type or existing.job_type
                existing.employment_type = item.employment_type or existing.employment_type
                existing.remote_type = item.remote_type or existing.remote_type
                existing.experience_required = (
                    item.experience_required or existing.experience_required
                )
                existing.salary_min = (
                    item.salary_min if item.salary_min is not None else existing.salary_min
                )
                existing.salary_max = (
                    item.salary_max if item.salary_max is not None else existing.salary_max
                )
                existing.apply_url = item.apply_url or existing.apply_url
                existing.expires_at = item.expires_at or existing.expires_at
                existing.source_job_id = item.source_job_id or existing.source_job_id
                duplicates += 1
                updated += 1
                continue

            company_name = item.company.strip()
            company = (
                db.query(Company).filter(func.lower(Company.name) == company_name.lower()).first()
            )
            if not company:
                company = Company(
                    name=company_name,
                    website=item.company_url,
                    careers_url=item.company_url,
                    is_hiring=True,
                )
                db.add(company)
                db.flush()

            job = Job(
                company_id=company.id,
                title=item.title.strip(),
                description=item.description,
                location=location,
                job_type=item.job_type,
                employment_type=item.employment_type,
                remote_type=item.remote_type or item.employment_type,
                status="ACTIVE",
                salary_min=item.salary_min,
                salary_max=item.salary_max,
                experience_required=item.experience_required,
                apply_url=item.apply_url,
                source=ingest_source,
                source_job_id=item.source_job_id,
                dedup_hash=fingerprint,
                posted_at=item.posted_at or now,
                expires_at=item.expires_at,
            )
            db.add(job)
            db.flush()
            for skill in {skill.strip().lower() for skill in item.skills if skill.strip()}:
                db.add(JobSkill(job_id=job.id, skill_name=skill, is_required=True))
            inserted += 1
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Job ingestion failed")

    return JobIngestResponse(
        status="success",
        source=payload.source,
        processed=len(payload.jobs),
        inserted=inserted,
        updated=updated,
        duplicates=duplicates,
    )


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
    experience: Optional[str] = None,
    job_type: Optional[str] = None,
    remote_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    jobs_svc: JobsService = Depends(get_jobs_service),
):
    """Search jobs by title, location, type, etc."""
    return jobs_svc.search_jobs(q, location, experience, job_type, remote_type, skip, limit)


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
    resume_text: Optional[str] = None  # Optional — auto-loaded from DB if authenticated
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
    db: Session = Depends(get_db),
):
    """AI analysis of a job description against resume text.

    If resume_text is omitted and the user is authenticated,
    the latest analyzed resume is fetched automatically from the DB.
    """
    from app.models.models import Resume

    resume_text = request.resume_text
    if not resume_text and current_user.id != -1:
        latest = (
            db.query(Resume)
            .filter(
                Resume.user_id == current_user.id,
                Resume.parsing_status == "completed",
            )
            .order_by(Resume.created_at.desc())
            .first()
        )
        if latest and latest.raw_text:
            resume_text = latest.raw_text

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume text provided and no analyzed resume found. Please upload a resume first.",
        )

    return await jobs_svc.match_job(
        current_user.id,
        resume_text,
        request.job_description,
        request.company_name,
        request.job_title,
    )
