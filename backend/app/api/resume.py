from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import json
import logging
import time

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User, Resume, Job
from app.engine.resume_pipeline import ResumeIntelligencePipeline
from app.services.profile_sync_service import ProfileSyncService
from app.services.career_copilot_service import CareerCopilotService
from app.services.storage_service import get_storage_service
from app.database.connection import get_db
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.logging import get_request_id
from app.rag.rag import index_text_content
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

router = APIRouter(prefix="/resume", tags=["resume"])
logger = logging.getLogger(__name__)


class AnalysisResult(BaseModel):
    overall_ats_score: int
    section_scores: dict
    personal_info: dict
    education: list
    experience: list
    projects: list
    tech_skills: list
    soft_skills: list
    certifications: list
    languages: list
    links: dict
    strengths: list
    weaknesses: list
    skill_gaps: list
    recommendations: list
    summary: str
    word_count: int


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    target_role: str = Form(None),
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Upload a resume (PDF/DOCX/TXT).
    Stage 1: Validate file.
    Stage 2: Extract text.
    Stage 3: Persist resume record BEFORE calling AI.
    Stage 4: Run AI analysis and update record.
    If AI fails, the resume record remains available for retry.
    """
    t0 = time.perf_counter()
    logger.info(
        "Resume upload started",
        extra={
            "user_id": current_user.id,
            "resume_filename": file.filename,
            "content_type": file.content_type,
            "request_id": get_request_id(),
        },
    )

    file_bytes = await file.read()
    pipeline = ResumeIntelligencePipeline()

    # Stage 1: Validate
    pipeline.validate_file(file_bytes, file.filename, file.content_type or "")

    # Stage 2: Extract text
    raw_text = pipeline.extract_text(file_bytes, file.filename)

    # Calculate next version number for this user
    max_version = (
        db.query(func.max(Resume.version))
        .filter(Resume.user_id == current_user.id)
        .scalar()
    )
    version = (max_version or 0) + 1

    # Stage 3: Persist to DB BEFORE AI analysis
    db_resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path="",
        file_size=len(file_bytes),
        version=version,
        parsing_status="pending",
        ats_score=0,
        raw_text=raw_text[:6000],
        parsed_json=None,
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    # Stage 3b: Upload raw file bytes to Supabase Storage (PRIVATELY).
    # This NEVER raises — on failure we just keep the DB row + raw_text.
    storage_ref = ""
    try:
        storage_svc = get_storage_service()
        storage_result = await storage_svc.upload_resume(
            user_id=current_user.id,
            resume_id=db_resume.id,
            filename=file.filename or "resume.bin",
            content_type=file.content_type or "application/octet-stream",
            file_bytes=file_bytes,
        )
        if storage_result.success:
            storage_ref = storage_result.reference
            db_resume.file_path = storage_ref
            db.commit()
            db.refresh(db_resume)
    except Exception as storage_exc:
        logger.warning(
            "Storage upload exception (non-fatal); DB row + raw_text preserved: %s",
            storage_exc,
            extra={
                "user_id": current_user.id,
                "resume_id": db_resume.id,
                "request_id": get_request_id(),
            },
        )

    # Stage 4: Run AI analysis
    try:
        parsed_data = await pipeline.analyze_with_ai(raw_text, target_role)
        parsed_data = pipeline.normalize_skills(parsed_data)

        db_resume.parsing_status = "completed"
        db_resume.ats_score = parsed_data.get("overall_ats_score", 0)
        db_resume.parsed_json = json.dumps(parsed_data)
        db.commit()
        db.refresh(db_resume)

        # Keep profile facts and semantic retrieval current as soon as a
        # successful analysis is available. ProfileSyncService only fills
        # blank fields, so user-entered profile data is never overwritten.
        ProfileSyncService().sync_profile(
            db,
            current_user.id,
            parsed_data,
            resume_id=db_resume.id,
            resume_version=version,
            target_role=target_role,
        )
        index_text_content(db_resume.id, db_resume.filename, raw_text)

        # Invalidate AI cache for career copilot
        CareerCopilotService(db).invalidate_cache(current_user.id)

        duration_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "Resume upload & analysis completed",
            extra={
                "user_id": current_user.id,
                "resume_id": db_resume.id,
                "resume_version": version,
                "ats_score": db_resume.ats_score,
                "duration_ms": round(duration_ms, 2),
                "request_id": get_request_id(),
            },
        )

        return {
            "message": "Resume parsed successfully.",
            "resume_id": db_resume.id,
            "version": version,
            "parsing_status": "completed",
            "parsed_data": parsed_data,
        }

    except Exception as exc:
        logger.warning(
            "Resume AI analysis failed; keeping persisted resume record: %s",
            exc,
            extra={
                "user_id": current_user.id,
                "resume_id": db_resume.id,
                "error": str(exc),
                "request_id": get_request_id(),
            },
        )
        db_resume.parsing_status = "failed"
        db.commit()
        db.refresh(db_resume)

        return {
            "message": "Resume uploaded successfully. AI analysis is temporarily unavailable; you can retry analysis anytime.",
            "resume_id": db_resume.id,
            "version": version,
            "parsing_status": "failed",
            "parsed_data": None,
        }


@router.post("/{resume_id}/reanalyze")
async def reanalyze_resume(
    resume_id: str,
    target_role: str = Form(None),
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Retry AI analysis on an already uploaded resume without re-uploading the file.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume.raw_text:
        raise HTTPException(
            status_code=400, detail="Resume has no extracted text to analyze."
        )

    pipeline = ResumeIntelligencePipeline()
    try:
        parsed_data = await pipeline.analyze_with_ai(resume.raw_text, target_role)
        parsed_data = pipeline.normalize_skills(parsed_data)

        resume.parsing_status = "completed"
        resume.ats_score = parsed_data.get("overall_ats_score", 0)
        resume.parsed_json = json.dumps(parsed_data)
        db.commit()
        db.refresh(resume)

        ProfileSyncService().sync_profile(
            db,
            current_user.id,
            parsed_data,
            resume_id=resume.id,
            resume_version=resume.version,
            target_role=target_role,
        )
        index_text_content(resume.id, resume.filename, resume.raw_text)

        CareerCopilotService(db).invalidate_cache(current_user.id)

        return {
            "message": "Resume re-analyzed successfully.",
            "resume_id": resume.id,
            "version": resume.version,
            "parsing_status": "completed",
            "parsed_data": parsed_data,
        }
    except Exception as exc:
        logger.error("Resume re-analysis failed: %s", exc)
        resume.parsing_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=502,
            detail="AI analysis failed during retry. Please try again later.",
        )


@router.post("/{resume_id}/sync")
async def sync_resume_profile(
    resume_id: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """
    Synchronize parsed resume data into UserProfile and UserSkill.
    Only called after explicit user confirmation from the frontend.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        logger.warning(
            "Resume sync: not found",
            extra={"resume_id": resume_id, "user_id": current_user.id},
        )
        raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume.parsed_json:
        raise HTTPException(status_code=409, detail="Resume has not been parsed yet.")

    parsed = json.loads(resume.parsed_json)
    sync_svc = ProfileSyncService()
    sync_svc.sync_profile(
        db,
        current_user.id,
        parsed,
        resume_id=resume.id,
        resume_version=resume.version,
    )

    logger.info(
        "Profile synced from resume",
        extra={
            "user_id": current_user.id,
            "resume_id": resume_id,
            "request_id": get_request_id(),
        },
    )
    return {"message": "Profile synchronized successfully."}


@router.get("/history")
async def get_resume_history(
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Return all resume versions for the current user, newest first."""
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "version": r.version,
            "ats_score": r.ats_score,
            "parsing_status": r.parsing_status,
            "file_size": r.file_size,
            "created_at": r.created_at,
        }
        for r in resumes
    ]


@router.get("/latest")
async def get_latest_resume(
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Return the user's most recently uploaded resume (metadata + skills).

    Frontend uses this to auto-populate Job Match IQ and Prep Kit flows
    without requiring the user to know or store their resume_id.
    """
    resume = (
        db.query(Resume)
        .filter(
            Resume.user_id == current_user.id,
            Resume.parsing_status == "completed",
        )
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No analyzed resume found. Please upload and analyze a resume first.",
        )

    tech_skills: list = []
    if resume.parsed_json:
        try:
            parsed = json.loads(resume.parsed_json)
            tech_skills = parsed.get("tech_skills", [])
        except json.JSONDecodeError:
            pass

    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "version": resume.version,
        "ats_score": resume.ats_score,
        "parsing_status": resume.parsing_status,
        "tech_skills": tech_skills,
        "has_raw_text": bool(resume.raw_text),
        "raw_text": resume.raw_text or "",
        "created_at": resume.created_at,
    }


# ── Helper ────────────────────────────────────────────────────────────────────
async def _collect_stream(stream) -> str:
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return "".join(chunks)


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    for prefix in ("```json", "```"):
        if clean.startswith(prefix):
            clean = clean[len(prefix):]
            break
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


class JobPipelineRequest(BaseModel):
    job_id: str


@router.post("/{resume_id}/job-pipeline")
async def resume_job_pipeline(
    resume_id: str,
    request: JobPipelineRequest,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """One-shot AI pipeline: resume + job → match score + cover letter +
    interview questions + roadmap focus.

    Replaces the manual 4-page workflow (Job Match IQ → Interview Coach →
    Roadmap → cover letter writing) with a single endpoint call.
    """
    t0 = time.perf_counter()

    # ── Load resume ──────────────────────────────────────────────────────────
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.raw_text:
        raise HTTPException(
            status_code=400,
            detail="Resume has no extracted text. Please reanalyze it first.",
        )

    # ── Load job ─────────────────────────────────────────────────────────────
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job_description = job.description or ""
    company_name = job.company.name if job.company else "the company"
    job_title = job.title

    logger.info(
        "Job pipeline started",
        extra={
            "user_id": current_user.id,
            "resume_id": resume_id,
            "job_id": request.job_id,
            "request_id": get_request_id(),
        },
    )

    # ── Single AI call — all outputs generated together ───────────────────────
    try:
        prompt = PromptManager.load(
            "resume/job_pipeline",
            job_title=job_title,
            company_name=company_name,
            resume_text=resume.raw_text[:5000],
            job_description=job_description[:3000],
        )
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        raw = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(raw)
            data = json.loads(clean)
        except json.JSONDecodeError:
            # Attempt to salvage a partial JSON object
            start = raw.find("{")
            if start >= 0:
                try:
                    data, _ = json.JSONDecoder().raw_decode(raw[start:])
                except json.JSONDecodeError:
                    data = {}
            else:
                data = {}

        # ── Normalise & provide safe defaults ────────────────────────────────
        # Compute matched skills from user_skills intersection with job_skills
        from app.models.models import UserSkill, JobSkill  # local import to avoid circularity
        user_skill_names = {
            s.skill_name.lower()
            for s in db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()
        }
        job_skill_names = {s.skill_name.lower() for s in job.skills}

        matched_from_db = [
            s.skill_name for s in job.skills if s.skill_name.lower() in user_skill_names
        ]
        missing_from_db = [
            s.skill_name for s in job.skills if s.skill_name.lower() not in user_skill_names
        ]

        duration_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "Job pipeline completed",
            extra={
                "user_id": current_user.id,
                "resume_id": resume_id,
                "job_id": request.job_id,
                "match_score": data.get("match_score"),
                "duration_ms": round(duration_ms, 2),
                "request_id": get_request_id(),
            },
        )

        return {
            "resume_id": resume_id,
            "job_id": request.job_id,
            "job_title": job_title,
            "company_name": company_name,
            # AI-computed values
            "match_score": data.get("match_score", 0),
            "matched_skills": data.get("matched_skills") or matched_from_db,
            "missing_skills": data.get("missing_skills") or missing_from_db,
            "cover_letter": data.get("cover_letter", ""),
            "interview_questions": data.get("interview_questions", []),
            "roadmap_focus": data.get("roadmap_focus", []),
            "roadmap_target_role": data.get("roadmap_target_role", job_title),
            "recommendation": data.get("recommendation", ""),
        }

    except Exception as exc:
        logger.error(
            "Job pipeline failed: %s",
            exc,
            extra={
                "user_id": current_user.id,
                "resume_id": resume_id,
                "job_id": request.job_id,
                "request_id": get_request_id(),
            },
        )
        raise HTTPException(
            status_code=502,
            detail="AI pipeline failed. Please try again in a moment.",
        )
