from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from app.database import get_db
from app.models import ChatSession, ChatMessage, ChatSessionSchema, ChatMessageSchema
from app.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    title: str = "New Conversation"

@router.get("/", response_model=List[ChatSessionSchema])
def get_sessions(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.created_at.desc()).all()
    return sessions

@router.post("/", response_model=ChatSessionSchema)
def create_session(session_data: SessionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    new_session = ChatSession(id=session_id, user_id=current_user.id, title=session_data.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/{session_id}", response_model=ChatSessionSchema)
def get_session(session_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session



@router.get("/{session_id}/messages", response_model=List[ChatMessageSchema])

def get_session_messages(session_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp.asc()).all()
    return messages

@router.delete("/{session_id}/messages")
def clear_session_messages(session_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()
    return {"status": "cleared"}

@router.delete("/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"status": "deleted"}
