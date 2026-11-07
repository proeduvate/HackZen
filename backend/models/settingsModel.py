from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field


class StudentSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    userId: str = Field(..., alias="userId")
    profileMode: str = Field(default="Public")
    emailNotifications: bool = Field(default=True)
    pushNotifications: bool = Field(default=False)
    theme: str = Field(default="Purple Dark")
    accessibilityMode: bool = Field(default=False)
    contentLanguage: str = Field(default="English (US)")
    twoFactorEnabled: bool = Field(default=False)
    dataSharing: bool = Field(default=True)
    allowTeamInvitations: bool = Field(default=True)
    notificationFrequency: str = Field(default="Instant")
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updatedAt: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
