from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from fastapi.responses import StreamingResponse

from app.auth.auth import get_current_user
from app.models.models import User
from app.core.dependencies.services import get_workspace_service, get_workspace_file_service
from app.services.workspace_service import WorkspaceService
from app.services.workspace_file_service import WorkspaceFileService

router = APIRouter(prefix="/workspace", tags=["workspace"])

# --- Schemas ---
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class LinkRequest(BaseModel):
    item_type: str  # "resume", "document", "note", "job"
    item_id: str

class WorkspaceChatRequest(BaseModel):
    message: str
    model: Optional[str] = "phi3"

# --- Routes ---

@router.post("/", response_model=dict)
async def create_workspace(
    request: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    workspace_svc: WorkspaceService = Depends(get_workspace_service)
):
    return workspace_svc.create_workspace(current_user.id, request.name, request.description)

@router.get("/", response_model=List[dict])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    workspace_svc: WorkspaceService = Depends(get_workspace_service)
):
    return workspace_svc.get_user_workspaces(current_user.id)

@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    workspace_svc: WorkspaceService = Depends(get_workspace_service)
):
    return workspace_svc.delete_workspace(workspace_id, current_user.id)

@router.post("/{workspace_id}/link")
async def link_item(
    workspace_id: str,
    request: LinkRequest,
    current_user: User = Depends(get_current_user),
    file_svc: WorkspaceFileService = Depends(get_workspace_file_service)
):
    return file_svc.link_item(workspace_id, request.item_type, request.item_id, current_user.id)

@router.get("/{workspace_id}/items", response_model=dict)
async def list_workspace_items(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    file_svc: WorkspaceFileService = Depends(get_workspace_file_service)
):
    return file_svc.get_workspace_items(workspace_id, current_user.id)

@router.get("/{workspace_id}/unlinked", response_model=dict)
async def list_unlinked_items(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    file_svc: WorkspaceFileService = Depends(get_workspace_file_service)
):
    return file_svc.get_unlinked_items(current_user.id)

@router.post("/{workspace_id}/chat")
async def chat_workspace(
    workspace_id: str,
    request: WorkspaceChatRequest,
    current_user: User = Depends(get_current_user),
    workspace_svc: WorkspaceService = Depends(get_workspace_service)
):
    stream_generator = workspace_svc.chat_workspace(workspace_id, current_user.id, request.message, request.model)
    return StreamingResponse(stream_generator(), media_type="text/plain")
