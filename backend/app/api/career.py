from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.dependencies.auth import GuestUser, get_current_user
from app.core.dependencies.services import get_career_service
from app.models.models import User
from app.services.career_service import CareerService

router = APIRouter(prefix="/career", tags=["career"])


class SkillGapRequest(BaseModel):
    target_role: str = Field(min_length=1)


class LearningPlanRequest(BaseModel):
    target_role: str = Field(min_length=1)
    weeks: int = Field(default=4, ge=1, le=24)


class MissionTickRequest(BaseModel):
    task_type: str = Field(min_length=1)


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
            "focus_areas": ["Complete your profile", "Upload a resume", "Set a target role"],
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
        return await service.analyze_skill_gaps(0, body.target_role)
    return await service.analyze_skill_gaps(current_user.id, body.target_role)


@router.post("/learning-plan")
async def learning_plan(
    body: LearningPlanRequest,
    current_user: User = Depends(get_current_user),
    service: CareerService = Depends(get_career_service),
):
    user_id = 0 if _is_guest(current_user) else current_user.id
    return await service.generate_learning_plan(user_id, body.target_role, body.weeks)


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
                "dsa": 0, "git": 0, "linkedin": 0, "jobs": 0,
                "course": 0, "interview": 0, "streak": 0,
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
