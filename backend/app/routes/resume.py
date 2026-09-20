from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from app.auth import get_current_user
from app.services import resume_service

router = APIRouter(tags=["resume"])
logger = logging.getLogger(__name__)


@router.post("/resume/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
):
    """
    Analyze an uploaded resume (PDF or TXT).
    Returns ATS score, skill gaps, missing sections, and suggestions.
    """
    allowed_types = {"application/pdf", "text/plain"}
    content_type = file.content_type or ""
    filename = file.filename or "resume"

    if content_type not in allowed_types and not filename.endswith((".pdf", ".txt")):
        raise HTTPException(
            status_code=400, detail="Only PDF or TXT resumes are supported."
        )

    try:
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:  # 5 MB limit
            raise HTTPException(
                status_code=400, detail="File too large. Max size is 5 MB."
            )

        result = resume_service.analyze_resume(content, filename, target_role)

        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")
