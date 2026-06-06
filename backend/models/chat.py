from datetime import datetime
from typing import Optional, List, Dict
from bson import ObjectId
from pydantic import Field, BaseModel
from schemas.chat import ChatMessageBase, MessageType


class ChatMessageInDB(ChatMessageBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
