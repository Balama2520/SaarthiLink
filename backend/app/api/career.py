from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.dependencies.auth import (
    GuestUser,
    get_current_user,
    require_authenticated_user,
)
from app.core.dependencies.services import get_career_service
from app.models.models import ChatMessage, ChatSession, Note, User
from app.services.career_service import CareerService
from app.services.career_copilot_service import CareerCopilotService
from app.ai.gateway import AIGateway
from app.database.connection import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/career", tags=["career"])


class SkillGapRequest(BaseModel):
    target_role: str = Field(min_length=1)


class LearningPlanRequest(BaseModel):
    target_role: str = Field(min_length=1)
    weeks: int = Field(default=4, ge=1, le=24)


class MissionTickRequest(BaseModel):
    task_type: str = Field(min_length=1)


class CopilotMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    session_id: str | None = None


class SaveInsightRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=20000)


def _is_guest(user: User | GuestUser) -> bool:
    return isinstance(user, GuestUser) or getattr(user, "id", None) == -1


@router.get("/dashboard")
def career_dashboard(
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        return {
            "headline": "Sign in to connect your profile, resume, and goals",
            "focus_areas": [
                "Complete your profile",
                "Upload a resume",
                "Set a target role",
            ],
            "next_actions": [
                "Create an account so Saarthi can use your career data",
                "Add a target role on your profile",
            ],
            "next_best_action": {
                "action": "Sign in or create an account to start your journey",
                "why": "Saarthi personalizes career milestones and ATS scoring to your target role.",
                "impact": "Crucial",
                "estimated_time": "2 minutes",
                "improves": ["Account Setup", "Personalized Insights"],
                "after_this": "Build your career profile.",
                "target_tab": "profile",
                "target_role": "General",
            },
            "career_health": {
                "overall_score": 15,
                "stage": "Exploration",
                "breakdown": {
                    "profile_completeness": 0,
                    "resume_readiness": 0,
                    "skill_match": 0,
                    "goal_execution": 0,
                    "interview_readiness": 0,
                },
                "biggest_gap": "Account Setup",
                "recommendation": "Sign in to track your career readiness and goals.",
            },
            "mission_progress": 0,
            "goal_count": 0,
            "stats": {
                "applications": 0,
                "interviews": 0,
                "ats_score": 0,
                "goals_in_progress": 0,
            },
            "activity": [],
        }
    return service.get_dashboard_summary(current_user.id)


@router.get("/next-action")
def get_next_action(
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        return {
            "action": "Sign in or create an account to start your journey",
            "why": "Saarthi personalizes career milestones and ATS scoring to your target role.",
            "impact": "Crucial",
            "estimated_time": "2 minutes",
            "improves": ["Account Setup", "Personalized Insights"],
            "after_this": "Build your career profile.",
            "target_tab": "profile",
            "target_role": "General",
        }
    return service.get_next_best_action(current_user.id)


@router.get("/health-indicator")
def get_health_indicator(
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        return {
            "overall_score": 15,
            "stage": "Exploration",
            "breakdown": {
                "profile_completeness": 0,
                "resume_readiness": 0,
                "skill_match": 0,
                "goal_execution": 0,
                "interview_readiness": 0,
            },
            "biggest_gap": "Account Setup",
            "recommendation": "Sign in to track your career readiness and goals.",
        }
    return service.get_career_health(current_user.id)


@router.post("/skill-gap")
async def skill_gap(
    body: SkillGapRequest,
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        raise HTTPException(
            status_code=401, detail="Sign in to analyze skill gaps."
        )
    return await service.analyze_skill_gaps(current_user.id, body.target_role)


@router.post("/learning-plan")
async def learning_plan(
    body: LearningPlanRequest,
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        raise HTTPException(
            status_code=401,
            detail="Sign in to generate a personalized learning plan.",
        )
    return await service.generate_learning_plan(current_user.id, body.target_role, body.weeks)



@router.post("/copilot/stream")
async def copilot_stream(
    body: CopilotMessageRequest,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Stream career guidance grounded in the current user's career data and recent conversation."""
    context = CareerCopilotService(db)._gather_user_context(current_user.id)
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == body.session_id, ChatSession.user_id == current_user.id)
        .first()
        if body.session_id
        else None
    )
    if not session:
        session = ChatSession(user_id=current_user.id, title="Career Copilot")
        db.add(session)
        db.commit()
        db.refresh(session)
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(12)
        .all()[::-1]
    )
    facts = {
        "target_role": context.get("target_role"),
        "skills": context.get("skills", [])[:20],
        "resume_skills": (context.get("parsed_resume") or {}).get("tech_skills", [])[:20],
        "resume_summary": (context.get("parsed_resume") or {}).get("summary", "")[:1000],
        "resume_ats_score": context.get("resume").ats_score if context.get("resume") else None,
        "goals": [goal.title for goal in context.get("goals", [])[:5]],
        "resume_available": bool(context.get("resume")),
    }
    messages = [
        {
            "role": "system",
            "content": f"You are Saarthi Career Copilot. Give concrete career advice grounded in: {facts}",
        }
    ]
    messages.extend({"role": item.role, "content": item.content} for item in history)
    messages.append({"role": "user", "content": body.message})
    db.add(ChatMessage(session_id=session.id, role="user", content=body.message))
    db.commit()

    async def stream():
        answer = ""
        async for chunk in AIGateway().generate_response_stream(messages, personality="career"):
            answer += chunk
            yield chunk.encode("utf-8")
        db.add(ChatMessage(session_id=session.id, role="assistant", content=answer))
        db.commit()

    return StreamingResponse(
        stream(), media_type="text/plain", headers={"X-Copilot-Session": session.id}
    )


@router.post("/copilot/insights")
def save_copilot_insight(
    body: SaveInsightRequest,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Save a selected Copilot answer as a searchable career note."""
    note = Note(
        user_id=current_user.id,
        title=body.title,
        content=body.content,
        tags="copilot,career-insight",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "title": note.title}


@router.get("/mission")
def mission_status(
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        return {
            "date": None,
            "dsa": 0,
            "git": 0,
            "linkedin": 0,
            "jobs": 0,
            "course": 0,
            "interview": 0,
            "streak": 0,
            "guest": True,
        }
    return service.get_mission_status(current_user.id)


@router.post("/mission/tick")
def mission_tick(
    body: MissionTickRequest,
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    if _is_guest(current_user):
        return {
            "status": "guest",
            "mission": {
                "dsa": 0,
                "git": 0,
                "linkedin": 0,
                "jobs": 0,
                "course": 0,
                "interview": 0,
                "streak": 0,
            },
        }
    task = "job" if body.task_type in ("job", "jobs") else body.task_type
    return service.tick_mission_task(current_user.id, task)


legacy_router = APIRouter(tags=["career"])


@legacy_router.get("/mission/status")
def legacy_mission_status(
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    return mission_status(current_user, service)


@legacy_router.post("/mission/tick")
def legacy_mission_tick(
    body: MissionTickRequest,
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    return mission_tick(body, current_user, service)
