from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    first_name: str
    last_name: str
    mobile_no: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    mobile_no: str | None = None

class TokenValidateRequest(BaseModel):
    token: str

class TokenValidateResponse(BaseModel):
    valid: bool
    message: str
    subject: str | None = None
    expires_at: str | None = None

class ChatTurn(BaseModel):
    role: str          # "user" or "model"
    parts: list[dict]  # [{"text": "..."}]

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None  # None = create new session

class ChatResponse(BaseModel):
    reply: str
    session_id: int

class ChatSessionCreate(BaseModel):
    asset_file_id: int

class ChatSessionSummary(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int

    class Config:
        from_attributes = True

class ChatSessionDetail(BaseModel):
    id: int
    asset_file_id: int
    title: Optional[str] = None
    messages: list
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
