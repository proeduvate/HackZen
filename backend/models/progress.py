from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.progress import TeamProgressBase, ProgressStatus

class TeamProgressInDB(TeamProgressBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    lastUpdated: datetime = Field(default_factory=datetime.utcnow, alias="lastUpdated")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class MilestoneProgressInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    progressId: str = Field(..., alias="progressId")
    milestoneId: str = Field(..., alias="milestoneId")
    completed: bool = False
    verifiedBy: Optional[str] = Field(None, alias="verifiedBy")
    verifiedAt: Optional[datetime] = Field(None, alias="verifiedAt")

    class Config:
        populate_by_name = True