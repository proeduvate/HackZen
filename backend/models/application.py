from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.application import ApplicationBase, ApplicationStatus

class ApplicationInDB(ApplicationBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    appliedAt: datetime = Field(default_factory=datetime.utcnow, alias="appliedAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
