from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    status: Optional[str] = "pending"
    priority: Optional[str] = "medium"
    progress: Optional[int] = 0
    due_date: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[int] = None
    due_date: Optional[str] = None

class GoalResponse(GoalBase):
    id: str
    user_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
