from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.notification import NotificationBase


class NotificationInDB(NotificationBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
