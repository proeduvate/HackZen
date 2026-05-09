from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId

class AILogBase(BaseModel):
    userId: str = Field(..., alias="userId")
    hackathonId: str = Field(..., alias="hackathonId")
    query: str
    response: str

class AILogResponse(AILogBase):
    id: str = Field(..., alias="_id")
    timestamp: datetime

    class Config:
        populate_by_name = True
