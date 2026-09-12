from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.dependencies.auth import require_authenticated_user
from app.models.models import User
from app.database.connection import get_db
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.workspace_file_repository import WorkspaceFileRepository
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspace", tags=["workspace"])


def _get_service(db: Session = Depends(get_db)) -> WorkspaceService:
    return WorkspaceService(WorkspaceRepository(db), WorkspaceFileRepository(db))


class CreateWorkspaceBody(BaseModel):
    name: str
    description: Optional[str] = ""


class LinkItemBody(BaseModel):
    item_type: str
    item_id: str


class WorkspaceChatBody(BaseModel):
    message: str
    model: Optional[str] = "phi3"


@router.post("/")
def create_workspace(
    body: CreateWorkspaceBody,
    current_user: User = Depends(require_authenticated_user),
    svc: WorkspaceService = Depends(_get_service),
):
    return svc.create_workspace(current_user.id, body.name, body.description or "")


@router.get("/")
def list_workspaces(
    current_user: User = Depends(require_authenticated_user),
    svc: WorkspaceService = Depends(_get_service),
):
    return svc.get_user_workspaces(current_user.id)


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(require_authenticated_user),
    svc: WorkspaceService = Depends(_get_service),
):
    return svc.delete_workspace(workspace_id, current_user.id)


@router.post("/{workspace_id}/link")
def link_item(
    workspace_id: str,
    body: LinkItemBody,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    file_repo = WorkspaceFileRepository(db)
    file_repo.link_item(workspace_id, body.item_type, body.item_id, current_user.id)
    return {"status": "linked"}


@router.get("/{workspace_id}/items")
def get_workspace_items(
    workspace_id: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    file_repo = WorkspaceFileRepository(db)
    resumes, docs, notes, jobs = file_repo.get_workspace_items(workspace_id, current_user.id)
    return {
        "resumes": [{"id": r.id, "filename": r.filename} for r in resumes],
        "docs": [{"id": d.id, "filename": d.filename} for d in docs],
        "notes": [{"id": n.id, "title": n.title} for n in notes],
        "jobs": [{"id": j.id, "job_title": j.job_title, "company": j.company} for j in jobs],
    }


@router.get("/{workspace_id}/unlinked")
def get_unlinked_items(
    workspace_id: str,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    file_repo = WorkspaceFileRepository(db)
    return file_repo.get_unlinked_items(current_user.id)


@router.post("/{workspace_id}/chat")
async def workspace_chat(
    workspace_id: str,
    body: WorkspaceChatBody,
    current_user: User = Depends(require_authenticated_user),
    svc: WorkspaceService = Depends(_get_service),
):
    stream_gen = svc.chat_workspace(workspace_id, current_user.id, body.message, body.model or "phi3")
    return StreamingResponse(stream_gen(), media_type="text/plain")
