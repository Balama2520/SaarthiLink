from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import logging

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, LearningRoadmap
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/roadmap", tags=["roadmap"])
logger = logging.getLogger(__name__)

class RoadmapRequest(BaseModel):
    target_role: str
    duration_days: int = 30

class RoadmapMilestone(BaseModel):
    day_range: str
    topic: str
    tasks: list[str]

class RoadmapResponse(BaseModel):
    target_role: str
    duration_days: int
    milestones: list[RoadmapMilestone]

@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.duration_days not in [30, 90]:
        raise HTTPException(status_code=400, detail="Duration must be 30 or 90 days.")

    prompt = f"""
    You are an expert Career and Learning Coach.
    Create a {request.duration_days}-day learning roadmap for someone aiming to become a {request.target_role}.
    
    Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
    {{
        "target_role": "{request.target_role}",
        "duration_days": {request.duration_days},
        "milestones": [
            {{
                "day_range": "Days 1-7",
                "topic": "Core Fundamentals",
                "tasks": ["Task 1", "Task 2"]
            }}
        ]
    }}
    """

    messages = [{"role": "user", "content": prompt}]
    response_stream = generate_response_stream_async(messages, personality="learning")
    
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
            db_roadmap = LearningRoadmap(
                user_id=current_user.id,
                title=f"{request.target_role} Roadmap",
                target_role=request.target_role,
                duration_days=request.duration_days,
                roadmap_json=json.dumps(parsed_data)
            )
            db.add(db_roadmap)
            db.commit()

        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to generate roadmap. Please try again.")
