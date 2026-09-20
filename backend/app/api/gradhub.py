from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User
from app.database.connection import get_db
from app.repositories.gradhub_repository import GradhubRepository
from app.services.gradhub_service import GradhubService

router = APIRouter(prefix="/gradhub", tags=["gradhub"])


def _get_service(db: Session = Depends(get_db)) -> GradhubService:
    return GradhubService(GradhubRepository(db))


# ── Degree ──────────────────────────────────────────────────────────────────


class AddCourseBody(BaseModel):
    semester: int
    course_name: str
    credits: int
    gpa: Optional[str] = None
    status: Optional[str] = "in_progress"


@router.post("/degree")
def add_course(
    body: AddCourseBody,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    course_id = svc.add_degree_course(
        current_user.id,
        body.semester,
        body.course_name,
        body.credits,
        body.gpa or "",
        body.status or "in_progress",
    )
    return {"id": course_id}


@router.get("/degree")
def list_courses(
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    return svc.list_degree_courses(current_user.id)


@router.delete("/degree/{course_id}")
def delete_course(
    course_id: str,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    svc.delete_degree_course(current_user.id, course_id)
    return {"status": "deleted"}


# ── Certifications ───────────────────────────────────────────────────────────


class AddCertBody(BaseModel):
    name: str
    provider: str
    target_date: Optional[str] = None
    status: Optional[str] = "planned"


@router.post("/certs")
def add_cert(
    body: AddCertBody,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    cert_id = svc.add_cert(
        current_user.id,
        body.name,
        body.provider,
        body.target_date or "",
        body.status or "planned",
    )
    return {"id": cert_id}


@router.get("/certs")
def list_certs(
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    return svc.list_certs(current_user.id)


@router.delete("/certs/{cert_id}")
def delete_cert(
    cert_id: str,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    svc.delete_cert(current_user.id, cert_id)
    return {"status": "deleted"}


# ── Placements ───────────────────────────────────────────────────────────────


class AddPlacementBody(BaseModel):
    company: str
    role: str
    rounds_json: Optional[str] = None
    package: Optional[str] = None
    status: Optional[str] = "applied"


class UpdatePlacementBody(BaseModel):
    status: Optional[str] = None
    package: Optional[str] = None
    rounds_json: Optional[str] = None


@router.post("/placements")
def add_placement(
    body: AddPlacementBody,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    placement_id = svc.add_placement(
        current_user.id,
        body.company,
        body.role,
        body.rounds_json or "",
        body.package or "",
        body.status or "applied",
    )
    return {"id": placement_id}


@router.get("/placements")
def list_placements(
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    return svc.list_placements(current_user.id)


@router.patch("/placements/{placement_id}")
def update_placement(
    placement_id: str,
    body: UpdatePlacementBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    repo = GradhubRepository(db)
    p = repo.get_placement(placement_id, current_user.id)
    from fastapi import HTTPException

    if not p:
        raise HTTPException(status_code=404, detail="Placement not found")
    if body.status is not None:
        p.status = body.status
    if body.package is not None:
        p.package = body.package
    if body.rounds_json is not None:
        p.rounds_json = body.rounds_json
    db.commit()
    return {"id": p.id, "status": p.status}


@router.delete("/placements/{placement_id}")
def delete_placement(
    placement_id: str,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    svc.delete_placement(current_user.id, placement_id)
    return {"status": "deleted"}


# ── AI Reviews ───────────────────────────────────────────────────────────────


class ReviewBody(BaseModel):
    profile_text: str
    target_role: str


@router.post("/github-review")
async def github_review(
    body: ReviewBody,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    return await svc.github_review(body.profile_text, body.target_role)


@router.post("/linkedin-optimize")
async def linkedin_optimize(
    body: ReviewBody,
    current_user: User = Depends(require_authenticated_user),
    svc: GradhubService = Depends(_get_service),
):
    return await svc.linkedin_optimize(body.profile_text, body.target_role)
