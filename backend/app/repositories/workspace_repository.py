from sqlalchemy.orm import Session
from app.models.models import AIWorkspace
from typing import List, Optional


class WorkspaceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: int) -> List[AIWorkspace]:
        return self.db.query(AIWorkspace).filter(AIWorkspace.user_id == user_id).all()

    def get_by_id_and_user(self, workspace_id: str, user_id: int) -> Optional[AIWorkspace]:
        return (
            self.db.query(AIWorkspace)
            .filter(AIWorkspace.id == workspace_id, AIWorkspace.user_id == user_id)
            .first()
        )

    def create(self, workspace: AIWorkspace) -> AIWorkspace:
        self.db.add(workspace)
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def update(self, workspace: AIWorkspace) -> AIWorkspace:
        self.db.add(workspace)
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def delete(self, workspace: AIWorkspace) -> None:
        self.db.delete(workspace)
        self.db.commit()
