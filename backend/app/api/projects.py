from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import logging

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Project
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)

class SkillForgeRequest(BaseModel):
    target_role: str
    current_skills: str

class SkillForgeProject(BaseModel):
    stage: str
    title: str
    description: str
    architecture: str
    roadmap: list[str]
    github_structure: str

class SkillForgeResponse(BaseModel):
    pipeline: list[SkillForgeProject]

@router.post("/generate", response_model=SkillForgeResponse)
async def generate_skillforge_pipeline(
    request: SkillForgeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prompt = f"""
    You are an expert Software Architect and Career Mentor. 
    The user wants to become a: {request.target_role}.
    Their current skills are: {request.current_skills}.
    
    Generate a 3-stage proof-of-work project pipeline (SkillForge) to build their employability.
    Stage 1: Foundation (proving basics)
    Stage 2: Core System (intermediate logic)
    Stage 3: Capstone (production readiness)
    
    Output STRICTLY as a valid JSON object matching this exact structure. Do not output markdown, just the JSON string:
    {{
        "pipeline": [
            {{
                "stage": "Foundation",
                "title": "Project Name",
                "description": "Short description",
                "architecture": "High level architecture overview",
                "roadmap": ["Step 1", "Step 2", "Step 3"],
                "github_structure": "frontend/\\nbackend/\\n..."
            }},
            {{
                "stage": "Core System",
                "title": "...",
                "description": "...",
                "architecture": "...",
                "roadmap": [],
                "github_structure": "..."
            }},
            {{
                "stage": "Capstone",
                "title": "...",
                "description": "...",
                "architecture": "...",
                "roadmap": [],
                "github_structure": "..."
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
        
        # Save the capstone project to DB as the primary tracker
        capstone = parsed_data.get("pipeline", [])[-1] if parsed_data.get("pipeline") else {}
        if capstone and current_user.id != -1:
            db_project = Project(
                user_id=current_user.id,
                title=capstone.get("title", "Untitled Capstone"),
                description=capstone.get("description", ""),
                github_url=""
            )
            db.add(db_project)
            db.commit()

        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to generate SkillForge pipeline. Please try again.")
