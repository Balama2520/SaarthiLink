from sqlalchemy.orm import Session
from app.models.models import ChatMessage, ChatSession
from typing import List

class MemoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_message(self, message: ChatMessage) -> ChatMessage:
        self.db.add(message)
        self.db.commit()
        return message

    def get_messages(self, session_id: str, limit: int = 20) -> List[ChatMessage]:
        return self.db.query(ChatMessage)\
            .filter(ChatMessage.session_id == session_id)\
            .order_by(ChatMessage.timestamp.desc())\
            .limit(limit)\
            .all()

    def delete_session(self, session_id: str) -> None:
        self.db.query(ChatSession).filter(ChatSession.id == session_id).delete()
        self.db.commit()
