from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.userSchema import UserRole


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    email: str
    password: str = Field(..., alias="passwordHash")
    role: UserRole
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Config:
        populate_by_name = True
