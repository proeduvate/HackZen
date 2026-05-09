from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId

class TeamMemberRole(str, Enum):
    LEADER = "leader"
    MEMBER = "member"

class TeamMemberBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    userId: str = Field(..., alias="userId")
    role: TeamMemberRole = TeamMemberRole.MEMBER

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberResponse(TeamMemberBase):
    id: str = Field(..., alias="_id")
    joinedAt: datetime = Field(..., alias="joinedAt")

    class Config:
        populate_by_name = True

class TeamBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamName: str = Field(..., alias="teamName")

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    teamName: Optional[str] = None
    mentorId: Optional[str] = None

class TeamMentorUpdate(BaseModel):
    mentorId: str

class TeamResponse(TeamBase):
    id: str = Field(None, alias="_id")
    teamCode: str = Field(None, alias="teamCode")
    createdBy: str = Field(None, alias="createdBy")
    mentorId: Optional[str] = Field(None, alias="mentorId")
    createdAt: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True