from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

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
    model: Optional[str] = "phi3"
    personality: Optional[str] = "default"
    image_data: Optional[str] = None
    ui_context: Optional[dict] = None

class ChatWithFileRequest(BaseModel):
    message: str
    file_id: str
    session_id: Optional[str] = "default"
    model: Optional[str] = "phi3"

class HealthResponse(BaseModel):
    status: str
    time: str
    target_ollama: str
