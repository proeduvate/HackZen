from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    MENTOR = "mentor"
    ORGANIZER = "organizer"
    ADMIN = "admin"


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole

    @validator("role", pre=True)
    def sanitize_role(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserCreate(UserBase):
    password: str

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class UserMyResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: EmailStr
    role: UserRole

    model_config = {"populate_by_name": True, "from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
