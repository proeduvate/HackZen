from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId


class SubmissionBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    stageId: str = Field(..., alias="stageId")
    fileUrl: str = Field(..., alias="fileUrl")
    project: str = Field(default="Untitled Project", alias="project")
    desc: str = Field(default="", alias="desc")
    category: str = Field(default="General", alias="category")
    status: str = Field(default="Pending", alias="status")
    version: int


class SubmissionCreate(SubmissionBase):
    pass


class SubmissionResponse(SubmissionBase):
    id: str = Field(..., alias="_id")
    submittedAt: datetime = Field(..., alias="submittedAt")

    class Config:
        populate_by_name = True
