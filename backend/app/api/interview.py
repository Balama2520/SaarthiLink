from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import logging

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, InterviewSession
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/interview", tags=["interview"])
logger = logging.getLogger(__name__)

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
    db: Session = Depends(get_db)
):
    prompt = f"""
    You are an expert Interview Coach. Evaluate the following mock interview transcript for the role of {request.target_role}.
    
    Transcript:
    {request.transcript[-5000:]}
    
    Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
    {{
        "score": (integer 0-100),
        "strengths": ["Strength 1", "Strength 2"],
        "areas_for_improvement": ["Area 1", "Area 2"],
        "feedback": "Overall constructive feedback summary."
    }}
    """

    messages = [{"role": "user", "content": prompt}]
    response_stream = generate_response_stream_async(messages, personality="interview")
    
    full_response = ""
    async for chunk in response_stream:
        full_response += chunk

    try:
        clean_json = full_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        
        parsed_data = json.loads(clean_json.strip())

        if current_user.id != -1:
            db_interview = InterviewSession(
                user_id=current_user.id,
                role=request.target_role,
                feedback=json.dumps(parsed_data),
                score=parsed_data.get("score", 0),
                transcript_json=json.dumps({"transcript": request.transcript})
            )
            db.add(db_interview)
            db.commit()

        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to evaluate interview. Please try again.")
