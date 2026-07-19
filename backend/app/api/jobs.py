from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import logging

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, JobApplication
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str
    company_name: str
    job_title: str

class JobMatchResponse(BaseModel):
    match_percentage: int
    missing_skills: list[str]
    recommendation: str

@router.post("/match", response_model=JobMatchResponse)
async def match_job(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prompt = f"""
    You are an AI Job Matcher. Evaluate the candidate's resume against the target job description.
    Job Title: {request.job_title}
    Company: {request.company_name}
    
    Resume:
    {request.resume_text[:3000]}
    
    Job Description:
    {request.job_description[:3000]}
    
    Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
    {{
        "match_percentage": (integer 0-100),
        "missing_skills": ["Skill 1", "Skill 2"],
        "recommendation": "Brief actionable advice on applying for this job."
    }}
    """

    messages = [{"role": "user", "content": prompt}]
    response_stream = generate_response_stream_async(messages, personality="career")
    
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
            db_job = JobApplication(
                user_id=current_user.id,
                company=request.company_name,
                job_title=request.job_title,
                match_percentage=parsed_data.get("match_percentage", 0),
                missing_skills=json.dumps(parsed_data.get("missing_skills", [])),
                status="analyzed"
            )
            db.add(db_job)
            db.commit()

        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to match job. Please try again.")
