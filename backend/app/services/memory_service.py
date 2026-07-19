from datetime import datetime, timezone
from typing import List, Dict
from app.repositories.memory_repository import MemoryRepository
from app.models.models import ChatMessage

class MemoryService:
    def __init__(self, repo: MemoryRepository):
        self.repo = repo

    def add_message(self, session_id: str, role: str, content: str) -> None:
        new_msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            timestamp=datetime.now(timezone.utc)
        )
        self.repo.add_message(new_msg)

    def get_history(self, session_id: str, limit: int = 20) -> List[Dict[str, str]]:
        messages = self.repo.get_messages(session_id, limit)
        return [{"role": m.role, "content": m.content} for m in reversed(messages)]

    def delete_session(self, session_id: str) -> None:
        self.repo.delete_session(session_id)

