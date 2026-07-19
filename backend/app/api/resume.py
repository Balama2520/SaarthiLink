from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import io
import PyPDF2

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.resume_service import ResumeService
from app.core.dependencies.services import get_resume_service

router = APIRouter(prefix="/resume", tags=["resume"])


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
    resume_svc: ResumeService = Depends(get_resume_service)
):
    try:
        content = await file.read()
        text = extract_text(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not read the uploaded file.")

    return await resume_svc.analyze_resume(current_user.id, text, file.filename, target_role)
