from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.core.dependencies.auth import get_current_user
from app.models.models import User
from app.database.connection import get_db
from app.repositories.research_repository import ResearchRepository
from app.services.research_service import ResearchService

router = APIRouter(prefix="/research", tags=["research"])


def _get_service(db: Session = Depends(get_db)) -> ResearchService:
    return ResearchService(ResearchRepository(db))


@router.post("/analyze")
async def analyze_paper(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    svc: ResearchService = Depends(_get_service),
):
    content = await file.read()
    return await svc.analyze_paper(content, file.filename or "")
