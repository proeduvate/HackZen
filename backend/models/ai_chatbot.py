from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.ai_chatbot import AILogBase


class AILogInDB(AILogBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
