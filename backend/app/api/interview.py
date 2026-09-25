import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User
from app.services.interview_service import InterviewService
from app.core.dependencies.services import get_interview_service

router = APIRouter(prefix="/interview", tags=["interview"])


class InterviewFeedbackRequest(BaseModel):
    transcript: str
    target_role: str


class CreateInterviewSessionRequest(BaseModel):
    role: str = Field(min_length=1, max_length=120)
    company: str | None = Field(default=None, max_length=120)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard|faang)$")


class InterviewAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=10_000)
    question_index: int = Field(ge=0, le=50)


class InterviewFeedbackResponse(BaseModel):
    score: int
    strengths: list[str]
    areas_for_improvement: list[str]
    feedback: str


@router.post("/evaluate", response_model=InterviewFeedbackResponse)
async def evaluate_interview(
    request: InterviewFeedbackRequest,
    current_user: User = Depends(require_authenticated_user),
    interview_svc: InterviewService = Depends(get_interview_service),
):
    return await interview_svc.evaluate_interview(
        current_user.id, request.transcript, request.target_role
    )


@router.post("/session")
async def create_interview_session(
    request: CreateInterviewSessionRequest,
    current_user: User = Depends(require_authenticated_user),
    interview_svc: InterviewService = Depends(get_interview_service),
):
    """Create a persisted interview session with AI-generated, role-specific questions."""
    session = await interview_svc.create_session(
        current_user.id, request.role, request.company, request.difficulty
    )
    return {
        "id": session.id,
        "role": session.role,
        "company": session.company,
        **json.loads(session.transcript_json or "{}"),
    }


@router.get("/sessions")
def list_interview_sessions(
    current_user: User = Depends(require_authenticated_user),
    interview_svc: InterviewService = Depends(get_interview_service),
):
    """List persisted interview sessions for the current user."""
    return [
        {
            "id": item.id,
            "role": item.role,
            "company": item.company,
            "score": item.score,
            "created_at": item.created_at,
            "feedback": json.loads(item.feedback) if item.feedback else None,
        }
        for item in interview_svc.list_sessions(current_user.id)
    ]


@router.post("/session/{session_id}/answer")
async def answer_interview_session(
    session_id: str,
    request: InterviewAnswerRequest,
    current_user: User = Depends(require_authenticated_user),
    interview_svc: InterviewService = Depends(get_interview_service),
):
    """Persist one answer and evaluate the session when its final question is answered."""
    session = await interview_svc.answer_session(
        current_user.id, session_id, request.answer, request.question_index
    )
    return {
        "id": session.id,
        "score": session.score,
        "feedback": json.loads(session.feedback) if session.feedback else None,
    }
