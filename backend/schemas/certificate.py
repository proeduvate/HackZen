from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Optional

class CertificateBase(BaseModel):
    userId: str = Field(..., alias="userId")
    teamId: str = Field(..., alias="teamId")
    hackathonId: str = Field(..., alias="hackathonId")
    certificateUrl: str = Field(..., alias="certificateUrl")
    filePath: Optional[str] = Field(None, alias="filePath")

class CertificateResponse(CertificateBase):
    id: str = Field(..., alias="_id")
    issuedAt: datetime = Field(..., alias="issuedAt")

    class Config:
        populate_by_name = True
