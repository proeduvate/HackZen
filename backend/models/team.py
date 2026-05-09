from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.team import TeamBase, TeamMemberRole

class TeamInDB(TeamBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class TeamMemberInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    teamId: str = Field(..., alias="teamId")
    userId: str = Field(..., alias="userId")
    role: TeamMemberRole = TeamMemberRole.MEMBER
    joinedAt: datetime = Field(default_factory=datetime.utcnow, alias="joinedAt")

    class Config:
        populate_by_name = True