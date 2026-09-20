from fastapi import HTTPException
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.workspace_file_repository import WorkspaceFileRepository


class WorkspaceFileService:
    def __init__(self, repo: WorkspaceRepository, file_repo: WorkspaceFileRepository):
        self.repo = repo
        self.file_repo = file_repo

    def link_item(
        self, workspace_id: str, item_type: str, item_id: str, user_id: int
    ) -> dict:
        ws = self.repo.get_by_id_and_user(workspace_id, user_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        if item_type == "resume":
            item = self.file_repo.get_resume(item_id, user_id)
            if not item:
                raise HTTPException(status_code=404, detail="Resume not found")
            item.workspace_id = workspace_id
        elif item_type == "document":
            item = self.file_repo.get_document(item_id, user_id)
            if not item:
                raise HTTPException(status_code=404, detail="Document not found")
            item.workspace_id = workspace_id
        elif item_type == "note":
            item = self.file_repo.get_note(int(item_id), user_id)
            if not item:
                raise HTTPException(status_code=404, detail="Note not found")
            item.workspace_id = workspace_id
        elif item_type == "job":
            item = self.file_repo.get_job(item_id, user_id)
            if not item:
                raise HTTPException(status_code=404, detail="Job application not found")
            item.workspace_id = workspace_id
        else:
            raise HTTPException(status_code=400, detail="Invalid item type")

        self.file_repo.commit()
        return {"status": "linked"}

    def get_workspace_items(self, workspace_id: str, user_id: int) -> dict:
        resumes, docs, notes, jobs = self.file_repo.get_workspace_items(
            workspace_id, user_id
        )
        return {
            "resumes": [
                {"id": r.id, "filename": r.filename, "ats_score": r.ats_score}
                for r in resumes
            ],
            "documents": [
                {"id": d.id, "filename": d.filename, "status": d.processed_status}
                for d in docs
            ],
            "notes": [{"id": n.id, "title": n.title, "tags": n.tags} for n in notes],
            "jobs": [
                {
                    "id": j.id,
                    "job_title": j.job_title,
                    "company": j.company,
                    "status": j.status,
                }
                for j in jobs
            ],
        }

    def get_unlinked_items(self, user_id: int) -> dict:
        resumes, docs, notes, jobs = self.file_repo.get_unlinked_items(user_id)
        return {
            "resumes": [
                {"id": r.id, "filename": r.filename, "ats_score": r.ats_score}
                for r in resumes
            ],
            "documents": [
                {"id": d.id, "filename": d.filename, "status": d.processed_status}
                for d in docs
            ],
            "notes": [{"id": n.id, "title": n.title, "tags": n.tags} for n in notes],
            "jobs": [
                {
                    "id": j.id,
                    "job_title": j.job_title,
                    "company": j.company,
                    "status": j.status,
                }
                for j in jobs
            ],
        }
