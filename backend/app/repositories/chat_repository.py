from sqlalchemy.orm import Session
from app.models.models import ChatSession, ChatMessage
from typing import List, Optional

class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_sessions_by_user(self, user_id: int) -> List[ChatSession]:
        return self.db.query(ChatSession).filter(
            ChatSession.user_id == user_id
        ).order_by(ChatSession.created_at.desc()).all()

    def get_session_by_id(self, session_id: str, user_id: int) -> Optional[ChatSession]:
        return self.db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == user_id
        ).first()

    def create_session(self, session: ChatSession) -> ChatSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def delete_session(self, session: ChatSession) -> None:
        self.db.delete(session)
        self.db.commit()

    def get_messages_by_session(self, session_id: str) -> List[ChatMessage]:
        return self.db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc()).all()

    def clear_messages_by_session(self, session_id: str) -> None:
        self.db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).delete()
        self.db.commit()
