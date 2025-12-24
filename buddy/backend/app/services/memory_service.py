from sqlalchemy.orm import Session
from app.models import ChatMessage
from datetime import datetime, timezone

def add_message(db: Session, session_id: str, role: str, content: str):
    new_msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(new_msg)
    db.commit()

def get_history(db: Session, session_id: str, limit: int = 20):
    messages = db.query(ChatMessage)\
        .filter(ChatMessage.session_id == session_id)\
        .order_by(ChatMessage.timestamp.desc())\
        .limit(limit)\
        .all()
    
    # Return in correct order for context (oldest first)
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]

def clear_history(db: Session, session_id: str):
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()
