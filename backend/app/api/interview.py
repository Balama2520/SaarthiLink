from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.models.models import User
from app.services.interview_service import InterviewService
from app.core.dependencies.services import get_interview_service

router = APIRouter(prefix="/interview", tags=["interview"])


class InterviewFeedbackRequest(BaseModel):
    transcript: str
    target_role: str


class InterviewFeedbackResponse(BaseModel):
    score: int
    strengths: list[str]
    areas_for_improvement: list[str]
    feedback: str


@router.post("/evaluate", response_model=InterviewFeedbackResponse)
async def evaluate_interview(
    request: InterviewFeedbackRequest,
    current_user: User = Depends(get_current_user),
    interview_svc: InterviewService = Depends(get_interview_service)
):
    return await interview_svc.evaluate_interview(
        current_user.id, request.transcript, request.target_role
    )

