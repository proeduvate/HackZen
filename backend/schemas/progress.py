from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ProgressStatus(str, Enum):
    NOT_STARTED = "not-started"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


class MilestoneProgressBase(BaseModel):
    progressId: str = Field(..., alias="progressId")
    milestoneId: str = Field(..., alias="milestoneId")
    completed: bool = False
    verifiedBy: Optional[str] = Field(None, alias="verifiedBy")
    verifiedAt: Optional[datetime] = Field(None, alias="verifiedAt")


class MilestoneProgressCreate(MilestoneProgressBase):
    pass


class MilestoneProgressResponse(MilestoneProgressBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class TeamProgressBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamId: str = Field(..., alias="teamId")
    currentStageId: str = Field(..., alias="currentStageId")
    status: ProgressStatus = ProgressStatus.NOT_STARTED


class TeamProgressCreate(TeamProgressBase):
    pass


class TeamProgressUpdate(BaseModel):
    currentStageId: Optional[str] = None
    status: Optional[ProgressStatus] = None


class TeamProgressResponse(TeamProgressBase):
    id: str = Field(..., alias="_id")
    lastUpdated: datetime = Field(..., alias="lastUpdated")

    class Config:
        populate_by_name = True
