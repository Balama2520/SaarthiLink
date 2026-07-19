from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import io
import json
import logging
import PyPDF2

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, Resume
from app.ai.llm import generate_response_stream_async
from app.config import get_settings

router = APIRouter(prefix="/resume", tags=["resume"])
logger = logging.getLogger(__name__)

class AnalysisResult(BaseModel):
    ats_score: int
    word_count: int
    found_sections: list[str]
    missing_sections: list[str]
    tech_skills_found: list[str]
    soft_skills_found: list[str]
    skill_gaps: list[str]
    target_role: str | None
    education: dict
    suggestions: list[str]
    summary: str

def extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    elif filename.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or TXT.")

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        text = extract_text(content, file.filename)
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(status_code=400, detail="Could not read the uploaded file.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="The document contains no readable text.")

    word_count = len(text.split())

    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and Career Coach. 
    Analyze the following resume text.
    Target Role: {target_role if target_role else 'General / Not specified'}
    
    Resume Text:
    ---
    {text[:5000]} # Limit to first 5000 chars to avoid token limits
    ---
    
    Provide your analysis STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
    {{
        "ats_score": (integer 0-100),
        "found_sections": [(list of strings like "Experience", "Education")],
        "missing_sections": [(list of strings)],
        "tech_skills_found": [(list of strings)],
        "soft_skills_found": [(list of strings)],
        "skill_gaps": [(list of strings relevant to the target role)],
        "target_role": (string or null),
        "education": {{"has_degree": true/false, "cgpa": "string or null"}},
        "suggestions": [(list of strings to improve the resume)],
        "summary": "Short 1-2 sentence summary of the resume's strength."
    }}
    """

    messages = [{"role": "user", "content": prompt}]
    
    response_stream = generate_response_stream_async(messages, personality="career")
    
    full_response = ""
    async for chunk in response_stream:
        full_response += chunk

    try:
        # Clean potential markdown wrapping
        clean_json = full_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        
        parsed_data = json.loads(clean_json.strip())

        if current_user.id != -1:
            db_resume = Resume(
                user_id=current_user.id,
                filename=file.filename or "resume",
                file_path="",
                ats_score=parsed_data.get("ats_score", 0),
                raw_text=text[:5000],
                parsed_json=json.dumps(parsed_data)
            )
            db.add(db_resume)
            db.commit()

        parsed_data["word_count"] = word_count
        return parsed_data

    except json.JSONDecodeError:
        logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
        raise HTTPException(status_code=500, detail="Failed to analyze resume. Please try again.")
