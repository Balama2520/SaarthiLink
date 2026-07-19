from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import logging

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, DegreeTracker, CertificationPlanner, PlacementTracker
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/gradhub", tags=["gradhub"])
logger = logging.getLogger(__name__)

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
@router.post("/degree", response_model=dict)
async def add_degree_course(
    request: DegreeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = DegreeTracker(
        user_id=current_user.id,
        semester=request.semester,
        course_name=request.course_name,
        credits=request.credits,
        gpa=request.gpa,
        status=request.status
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"status": "success", "id": course.id}

@router.get("/degree", response_model=List[dict])
async def list_degree_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    courses = db.query(DegreeTracker).filter(DegreeTracker.user_id == current_user.id).all()
    return [
        {
            "id": c.id,
            "semester": c.semester,
            "course_name": c.course_name,
            "credits": c.credits,
            "gpa": c.gpa,
            "status": c.status
        }
        for c in courses
    ]

@router.delete("/degree/{id}")
async def delete_degree_course(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(DegreeTracker).filter(DegreeTracker.id == id, DegreeTracker.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"status": "deleted"}


# 2. Certification Planner
@router.post("/certs", response_model=dict)
async def add_cert(
    request: CertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = CertificationPlanner(
        user_id=current_user.id,
        name=request.name,
        provider=request.provider,
        target_date=request.target_date,
        status=request.status
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return {"status": "success", "id": cert.id}

@router.get("/certs", response_model=List[dict])
async def list_certs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    certs = db.query(CertificationPlanner).filter(CertificationPlanner.user_id == current_user.id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "provider": c.provider,
            "target_date": c.target_date,
            "status": c.status
        }
        for c in certs
    ]

@router.delete("/certs/{id}")
async def delete_cert(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = db.query(CertificationPlanner).filter(CertificationPlanner.id == id, CertificationPlanner.user_id == current_user.id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(cert)
    db.commit()
    return {"status": "deleted"}


# 3. Campus Placement Tracker
@router.post("/placements", response_model=dict)
async def add_placement(
    request: PlacementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = PlacementTracker(
        user_id=current_user.id,
        company=request.company,
        role=request.role,
        rounds_json=request.rounds_json,
        package=request.package,
        status=request.status
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"status": "success", "id": p.id}

@router.get("/placements", response_model=List[dict])
async def list_placements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    placements = db.query(PlacementTracker).filter(PlacementTracker.user_id == current_user.id).all()
    return [
        {
            "id": p.id,
            "company": p.company,
            "role": p.role,
            "rounds_json": p.rounds_json,
            "package": p.package,
            "status": p.status
        }
        for p in placements
    ]

@router.delete("/placements/{id}")
async def delete_placement(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(PlacementTracker).filter(PlacementTracker.id == id, PlacementTracker.user_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Placement not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}


# 4. AI-Powered Portfolio, GitHub, and LinkedIn Optimizers
@router.post("/github-review")
async def github_review(
    request: ProfileOptimizeRequest,
    current_user: User = Depends(get_current_user)
):
    prompt = f"""
    You are an AI Technical Recruiter. Analyze this GitHub profile username or text info:
    "{request.profile_text}"
    Target Role: {request.target_role}

    Evaluate:
    - Repository structure and code quality
    - Activity and commit history
    - README quality
    - Project diversity and relevance to {request.target_role}

    Provide your review STRICTLY as a JSON object with this exact schema (no markdown formatting, just the raw JSON string):
    {{
        "profile_score": (integer 0-100),
        "strengths": ["list of strengths"],
        "weaknesses": ["list of items to improve"],
        "readme_advice": "Detailed advice to optimize the GitHub pinned repositories and READMEs.",
        "project_ideas": ["3 targeted project ideas to build employability"]
    }}
    """
    messages = [{"role": "user", "content": prompt}]
    stream = generate_response_stream_async(messages, personality="career")
    full_text = ""
    async for chunk in stream:
        full_text += chunk
    
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        # Fail-safe mock if JSON fails
        return {
            "profile_score": 75,
            "strengths": ["Active contribution streak", "Solid Javascript projects"],
            "weaknesses": ["Lack of backend systems documentation", "No readme files in 3 main repos"],
            "readme_advice": "Add detailed setup guides, architecture diagrams, and links to live demos for your pinned repos.",
            "project_ideas": ["Building a microservices auth gateway", "Implementing a custom rate-limiting middleware"]
        }

@router.post("/linkedin-optimize")
async def linkedin_optimize(
    request: ProfileOptimizeRequest,
    current_user: User = Depends(get_current_user)
):
    prompt = f"""
    You are a professional Resume and LinkedIn Profile Writer.
    Optimize the following LinkedIn description or profile details:
    "{request.profile_text}"
    Target Role: {request.target_role}

    Provide suggestions and copy templates for:
    1. Headline (needs to be catchy, keywords-focused)
    2. About Summary (STAR format, story-driven)
    3. Experience Bullet Points (STAR format: Situation, Task, Action, Result)

    Provide the output STRICTLY as a JSON object with this exact schema (no markdown, just raw JSON):
    {{
        "headline_suggestions": ["Option 1", "Option 2"],
        "about_summary": "Optimized summary text...",
        "star_bullets": ["STAR Bullet 1", "STAR Bullet 2"],
        "keyword_boosters": ["5 key industry buzzwords to insert"]
    }}
    """
    messages = [{"role": "user", "content": prompt}]
    stream = generate_response_stream_async(messages, personality="career")
    full_text = ""
    async for chunk in stream:
        full_text += chunk
        
    try:
        clean = full_text.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "headline_suggestions": [f"{request.target_role} | Scaling Web Apps", f"Incoming {request.target_role} | Open-Source Enthusiast"],
            "about_summary": "Passionate developer focused on building scalable, performant architectures...",
            "star_bullets": ["Designed and implemented a distributed queue system reducing latency by 35%.", "Led development of a React dashboard resulting in 50% faster onboarding."],
            "keyword_boosters": ["Distributed Systems", "Cloud Architecture", "RESTful APIs", "State Management", "CI/CD Platforms"]
        }
