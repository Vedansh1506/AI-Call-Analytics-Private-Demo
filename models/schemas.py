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
