from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApplicationBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    userId: str = Field(..., alias="userId")
    teamId: Optional[str] = Field(None, alias="teamId")
    status: ApplicationStatus = ApplicationStatus.PENDING


class ApplicationCreate(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamId: Optional[str] = Field(None, alias="teamId")


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    teamId: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: str = Field(..., alias="_id")
    appliedAt: datetime = Field(..., alias="appliedAt")

    class Config:
        populate_by_name = True
