from fastapi import APIRouter
from app.auth.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.roadmap import router as roadmap_router
from app.api.jobs import router as jobs_router
from app.api.interview import router as interview_router
from app.routes.sessions import router as sessions_router
from app.routes.chat import router as chat_router
from app.api.projects import router as projects_router
from app.api.research import router as research_router
from app.api.admin import router as admin_router
from app.api.notes import router as notes_router
from app.api.workspace import router as workspace_router
from app.api.gradhub import router as gradhub_router
from app.api.extra_features import router as extra_features_router
from app.api.higher_studies import router as higher_studies_router
from app.api.experiments import router as experiments_router
from app.api.goals import router as goals_router

api_router = APIRouter()

# Register core route blueprints
api_router.include_router(auth_router)
api_router.include_router(resume_router)
api_router.include_router(roadmap_router)
api_router.include_router(jobs_router)
api_router.include_router(interview_router)
api_router.include_router(sessions_router)
api_router.include_router(chat_router)
api_router.include_router(projects_router)
api_router.include_router(research_router)
api_router.include_router(admin_router)
api_router.include_router(notes_router)
api_router.include_router(workspace_router)
api_router.include_router(gradhub_router)
api_router.include_router(extra_features_router)
api_router.include_router(higher_studies_router)
api_router.include_router(experiments_router)
api_router.include_router(goals_router)
