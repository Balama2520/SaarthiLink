from pydantic import BaseModel
from typing import Literal, Optional


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(UserBase):
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    role: Literal["admin", "user"] = "user"


class TokenData(BaseModel):
    username: Optional[str] = None
