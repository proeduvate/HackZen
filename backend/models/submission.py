from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.submission import SubmissionBase

class SubmissionInDB(SubmissionBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    submittedAt: datetime = Field(default_factory=datetime.utcnow, alias="submittedAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
