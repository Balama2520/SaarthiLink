from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from PyPDF2 import PdfReader
from pydantic import BaseModel

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.services.research_service import ResearchService
from app.core.dependencies.services import get_research_service

router = APIRouter(prefix="/research", tags=["research"])


class CompassRequest(BaseModel):
    interests: str


@router.post("/analyze")
async def analyze_paper(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    research_svc: ResearchService = Depends(get_research_service)
):
    """Upload a PDF or text file; returns AI-generated summary, notes, and quiz."""
    try:
        if file.filename.endswith(".pdf"):
            reader = PdfReader(file.file)
            text = "".join(
                [page.extract_text() for page in reader.pages if page.extract_text()]
            )
        else:
            text = (await file.read()).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    return await research_svc.analyze_paper(text)


@router.post("/compass")
async def get_research_compass(
    request: CompassRequest,
    current_user: User = Depends(get_current_user),
    research_svc: ResearchService = Depends(get_research_service)
):
    """Generate a research roadmap based on the user's interests."""
    return await research_svc.get_compass(request.interests)


@router.get("/matrix")
async def generate_matrix(
    current_user: User = Depends(get_current_user),
    research_svc: ResearchService = Depends(get_research_service)
):
    """Automatically build a literature matrix from the user's saved papers."""
    return await research_svc.generate_matrix(current_user.id)


@router.post("/gap-finder")
async def find_research_gap(
    current_user: User = Depends(get_current_user),
    research_svc: ResearchService = Depends(get_research_service)
):
    """Identify research gaps and novel ideas from the user's literature library."""
    return await research_svc.find_gaps(current_user.id)

