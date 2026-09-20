from fastapi import APIRouter
from app.auth.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.roadmap import router as roadmap_router
from app.api.jobs import router as jobs_router
from app.api.interview import router as interview_router
from app.api.goals import router as goals_router
from app.api.profile import router as profile_router
from app.api.career import (
    router as career_router,
    legacy_router as career_legacy_router,
)
from app.api.workspace import router as workspace_router
from app.api.gradhub import router as gradhub_router
from app.api.notes import router as notes_router
from app.api.research import router as research_router
from app.api.projects import router as projects_router
from app.api.admin import router as admin_router
from app.api.toolkit import router as toolkit_router
from app.api.sessions import router as sessions_router, chat_router

# ── New Saarthi Discovery & Ecosystem Routers ─────────────────────────────────
from app.api.seeding import router as seeding_router
from app.api.discovery import router as discovery_router
from app.api.feedback import router as feedback_router
from app.api.contact import router as contact_router
from app.api.opportunities import router as opportunities_router

api_router = APIRouter()

# ── Core ──────────────────────────────────────────────────────────────────────
api_router.include_router(auth_router)
api_router.include_router(resume_router)
api_router.include_router(roadmap_router)
api_router.include_router(jobs_router)
api_router.include_router(interview_router)
api_router.include_router(goals_router)
api_router.include_router(profile_router)
api_router.include_router(career_router)
api_router.include_router(career_legacy_router)

# ── Feature modules ───────────────────────────────────────────────────────────
api_router.include_router(workspace_router)
api_router.include_router(gradhub_router)
api_router.include_router(notes_router)
api_router.include_router(research_router)
api_router.include_router(projects_router)
api_router.include_router(admin_router)
api_router.include_router(toolkit_router)
api_router.include_router(sessions_router)
api_router.include_router(chat_router)

# ── Saarthi Intelligence & Discovery ──────────────────────────────────────────
api_router.include_router(seeding_router)
api_router.include_router(discovery_router)
api_router.include_router(feedback_router)
api_router.include_router(contact_router)
api_router.include_router(opportunities_router)
