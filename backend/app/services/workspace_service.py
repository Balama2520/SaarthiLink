from fastapi import HTTPException
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.workspace_file_repository import WorkspaceFileRepository
from typing import List, Dict, Any

class WorkspaceService:
    def __init__(self, repo: WorkspaceRepository, file_repo: WorkspaceFileRepository):
        self.repo = repo
        self.file_repo = file_repo

    def create_workspace(self, user_id: int, name: str, description: str) -> dict:
        from app.models.models import AIWorkspace
        ws = AIWorkspace(user_id=user_id, name=name, description=description)
        created_ws = self.repo.create(ws)
        return {"status": "success", "id": created_ws.id, "name": created_ws.name}

    def get_user_workspaces(self, user_id: int) -> List[dict]:
        workspaces = self.repo.get_by_user(user_id)
        out = []
        for ws in workspaces:
            counts = self.file_repo.get_item_counts(ws.id)
            out.append({
                "id": ws.id,
                "name": ws.name,
                "description": ws.description,
                "created_at": ws.created_at.isoformat(),
                "counts": counts
            })
        return out

    def delete_workspace(self, workspace_id: str, user_id: int) -> dict:
        ws = self.repo.get_by_id_and_user(workspace_id, user_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        self.file_repo.unlink_all_from_workspace(workspace_id)
        self.repo.delete(ws)
        return {"status": "deleted"}

    def chat_workspace(self, workspace_id: str, user_id: int, message: str, model: str):
        from app.services.file_service import get_file_text
        from app.ai.llm import generate_response_stream_async
        import logging
        logger = logging.getLogger(__name__)

        ws = self.repo.get_by_id_and_user(workspace_id, user_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        resumes, docs, notes, jobs = self.file_repo.get_workspace_items(workspace_id, user_id)
        
        context_parts = []
        for r in resumes:
            if r.raw_text:
                context_parts.append(f"=== GROUNDING SOURCE: Resume (Filename: {r.filename}) ===\n{r.raw_text}")
                
        for d in docs:
            file_text = get_file_text(d.id)
            if file_text:
                context_parts.append(f"=== GROUNDING SOURCE: Document (Filename: {d.filename}) ===\n{file_text}")
                
        for n in notes:
            context_parts.append(f"=== GROUNDING SOURCE: AI Study Note (Title: {n.title}) ===\n{n.content}")
            
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
            {"role": "user", "content": message}
        ]
        
        async def stream_generator():
            try:
                async for chunk in generate_response_stream_async(messages, model, personality="career"):
                    yield chunk.encode("utf-8")
            except Exception as e:
                logger.error(f"Workspace chat streaming error: {e}")
                yield f"⚠️ Grounded workspace error: {str(e)}".encode("utf-8")
                
        return stream_generator
