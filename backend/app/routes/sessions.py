from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel

from app.schemas.chat import ChatSessionSchema, ChatMessageSchema
from app.auth.auth import get_current_user
from app.models.models import User
from app.services.chat_service import ChatService
from app.core.dependencies.services import get_chat_service

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    title: str = "New Conversation"

@router.get("/", response_model=List[ChatSessionSchema])
def get_sessions(
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return service.get_user_sessions(current_user.id)

@router.post("/", response_model=ChatSessionSchema)
def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return service.create_session(session_data.title, current_user.id)

@router.get("/{session_id}", response_model=ChatSessionSchema)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return service.get_session(session_id, current_user.id)

@router.get("/{session_id}/messages", response_model=List[ChatMessageSchema])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return service.get_session_messages(session_id, current_user.id)

@router.delete("/{session_id}/messages")
def clear_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    service.clear_session_messages(session_id, current_user.id)
    return {"status": "cleared"}

@router.delete("/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    service.delete_session(session_id, current_user.id)
    return {"status": "deleted"}
