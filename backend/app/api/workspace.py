from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json
import logging
from fastapi.responses import StreamingResponse

from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.models import User, AIWorkspace, Resume, Document, JobApplication
from app.api.notes import Note
from app.services.file_service import get_file_text
from app.ai.llm import generate_response_stream_async

router = APIRouter(prefix="/workspace", tags=["workspace"])
logger = logging.getLogger(__name__)

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
    db: Session = Depends(get_db)
):
    ws = AIWorkspace(
        user_id=current_user.id,
        name=request.name,
        description=request.description
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return {"status": "success", "id": ws.id, "name": ws.name}

@router.get("/", response_model=List[dict])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspaces = db.query(AIWorkspace).filter(AIWorkspace.user_id == current_user.id).all()
    out = []
    for ws in workspaces:
        # Count elements
        resumes_count = db.query(Resume).filter(Resume.workspace_id == ws.id).count()
        docs_count = db.query(Document).filter(Document.workspace_id == ws.id).count()
        notes_count = db.query(Note).filter(Note.workspace_id == ws.id).count()
        jobs_count = db.query(JobApplication).filter(JobApplication.workspace_id == ws.id).count()
        
        out.append({
            "id": ws.id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at.isoformat(),
            "counts": {
                "resumes": resumes_count,
                "documents": docs_count,
                "notes": notes_count,
                "jobs": jobs_count
            }
        })
    return out

@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = db.query(AIWorkspace).filter(AIWorkspace.id == workspace_id, AIWorkspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Unlink documents/resumes/notes/jobs (set workspace_id to null)
    db.query(Resume).filter(Resume.workspace_id == workspace_id).update({Resume.workspace_id: None})
    db.query(Document).filter(Document.workspace_id == workspace_id).update({Document.workspace_id: None})
    db.query(Note).filter(Note.workspace_id == workspace_id).update({Note.workspace_id: None})
    db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id).update({JobApplication.workspace_id: None})
    
    db.delete(ws)
    db.commit()
    return {"status": "deleted"}

@router.post("/{workspace_id}/link")
async def link_item(
    workspace_id: str,
    request: LinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify workspace
    ws = db.query(AIWorkspace).filter(AIWorkspace.id == workspace_id, AIWorkspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if request.item_type == "resume":
        item = db.query(Resume).filter(Resume.id == request.item_id, Resume.user_id == current_user.id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Resume not found")
        item.workspace_id = workspace_id
    elif request.item_type == "document":
        item = db.query(Document).filter(Document.id == request.item_id, Document.user_id == current_user.id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Document not found")
        item.workspace_id = workspace_id
    elif request.item_type == "note":
        item = db.query(Note).filter(Note.id == int(request.item_id), Note.user_id == current_user.id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Note not found")
        item.workspace_id = workspace_id
    elif request.item_type == "job":
        item = db.query(JobApplication).filter(JobApplication.id == request.item_id, JobApplication.user_id == current_user.id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Job application not found")
        item.workspace_id = workspace_id
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
        
    db.commit()
    return {"status": "linked"}

@router.get("/{workspace_id}/items", response_model=dict)
async def list_workspace_items(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resumes = db.query(Resume).filter(Resume.workspace_id == workspace_id, Resume.user_id == current_user.id).all()
    docs = db.query(Document).filter(Document.workspace_id == workspace_id, Document.user_id == current_user.id).all()
    notes = db.query(Note).filter(Note.workspace_id == workspace_id, Note.user_id == current_user.id).all()
    jobs = db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id, JobApplication.user_id == current_user.id).all()
    
    return {
        "resumes": [{"id": r.id, "filename": r.filename, "ats_score": r.ats_score} for r in resumes],
        "documents": [{"id": d.id, "filename": d.filename, "status": d.processed_status} for d in docs],
        "notes": [{"id": n.id, "title": n.title, "tags": n.tags} for n in notes],
        "jobs": [{"id": j.id, "job_title": j.job_title, "company": j.company, "status": j.status} for j in jobs]
    }

@router.get("/{workspace_id}/unlinked", response_model=dict)
async def list_unlinked_items(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resumes = db.query(Resume).filter(Resume.workspace_id == None, Resume.user_id == current_user.id).all()
    docs = db.query(Document).filter(Document.workspace_id == None, Document.user_id == current_user.id).all()
    notes = db.query(Note).filter(Note.workspace_id == None, Note.user_id == current_user.id).all()
    jobs = db.query(JobApplication).filter(JobApplication.workspace_id == None, JobApplication.user_id == current_user.id).all()
    
    return {
        "resumes": [{"id": r.id, "filename": r.filename, "ats_score": r.ats_score} for r in resumes],
        "documents": [{"id": d.id, "filename": d.filename, "status": d.processed_status} for d in docs],
        "notes": [{"id": n.id, "title": n.title, "tags": n.tags} for n in notes],
        "jobs": [{"id": j.id, "job_title": j.job_title, "company": j.company, "status": j.status} for j in jobs]
    }

@router.post("/{workspace_id}/chat")
async def chat_workspace(
    workspace_id: str,
    request: WorkspaceChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = db.query(AIWorkspace).filter(AIWorkspace.id == workspace_id, AIWorkspace.user_id == current_user.id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    context_parts = []
    
    resumes = db.query(Resume).filter(Resume.workspace_id == workspace_id).all()
    for r in resumes:
        if r.raw_text:
            context_parts.append(f"=== GROUNDING SOURCE: Resume (Filename: {r.filename}) ===\n{r.raw_text}")
            
    docs = db.query(Document).filter(Document.workspace_id == workspace_id).all()
    for d in docs:
        file_text = get_file_text(d.id)
        if file_text:
            context_parts.append(f"=== GROUNDING SOURCE: Document (Filename: {d.filename}) ===\n{file_text}")
            
    notes = db.query(Note).filter(Note.workspace_id == workspace_id).all()
    for n in notes:
        context_parts.append(f"=== GROUNDING SOURCE: AI Study Note (Title: {n.title}) ===\n{n.content}")
        
    jobs = db.query(JobApplication).filter(JobApplication.workspace_id == workspace_id).all()
    for j in jobs:
        context_parts.append(f"=== GROUNDING SOURCE: Job Application (Role: {j.job_title} at {j.company}) ===\nStatus: {j.status}\nDescription: {j.description or 'No description provided.'}")
        
    grounding_context = "\n\n".join(context_parts)
    
    system_prompt = f"""You are a grounded career operating system workspace AI. 
    You are grounded ONLY on the sources uploaded/linked to this workspace by the user.
    If the user asks questions, answer using the grounding sources below. If the information is not present in the grounding sources, tell the user clearly, but try your best to suggest logical next steps.
    
    Grounding Sources for Workspace "{ws.name}":
    ---
    {grounding_context if grounding_context else "No files, resumes, or descriptions have been uploaded to this workspace yet."}
    ---
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.message}
    ]
    
    async def stream_generator():
        try:
            async for chunk in generate_response_stream_async(messages, request.model, personality="career"):
                yield chunk.encode("utf-8")
        except Exception as e:
            logger.error(f"Workspace chat streaming error: {e}")
            yield f"⚠️ Grounded workspace error: {str(e)}".encode("utf-8")
            
    return StreamingResponse(stream_generator(), media_type="text/plain")
