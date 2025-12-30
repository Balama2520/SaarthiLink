from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sessions = relationship("ChatSession", back_populates="owner")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    owner = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String)
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    session = relationship("ChatSession", back_populates="messages")
    __table_args__ = (Index('ix_messages_session_timestamp', 'session_id', 'timestamp'),)

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatMessageSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionSchema(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[ChatMessageSchema] = []
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = "default"
    model: Optional[str] = "gemma3:1b"
    personality: Optional[str] = "default"


class ChatWithFileRequest(BaseModel):
    message: str
    file_id: str
    session_id: Optional[str] = "default"
    model: Optional[str] = "gemma3:1b"

class HealthResponse(BaseModel):
    status: str
    time: str
    target_ollama: str
