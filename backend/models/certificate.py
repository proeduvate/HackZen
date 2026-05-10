from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.certificate import CertificateBase


class CertificateInDB(CertificateBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    issuedAt: datetime = Field(default_factory=datetime.utcnow, alias="issuedAt")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
