from fastapi import HTTPException
from app.repositories.chat_repository import ChatRepository
from app.models.models import ChatSession, ChatMessage
from typing import List
import uuid

class ChatService:
    def __init__(self, repo: ChatRepository):
        self.repo = repo

    def get_user_sessions(self, user_id: int) -> List[ChatSession]:
        return self.repo.get_sessions_by_user(user_id)

    def create_session(self, title: str, user_id: int) -> ChatSession:
        session_id = str(uuid.uuid4())
        session = ChatSession(id=session_id, user_id=user_id, title=title)
        return self.repo.create_session(session)

    def get_session(self, session_id: str, user_id: int) -> ChatSession:
        session = self.repo.get_session_by_id(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    def get_session_messages(self, session_id: str, user_id: int) -> List[ChatMessage]:
        self.get_session(session_id, user_id)  # verify ownership
        return self.repo.get_messages_by_session(session_id)

    def clear_session_messages(self, session_id: str, user_id: int) -> None:
        self.get_session(session_id, user_id)  # verify ownership
        self.repo.clear_messages_by_session(session_id)

    def delete_session(self, session_id: str, user_id: int) -> None:
        session = self.get_session(session_id, user_id)
        self.repo.delete_session(session)
