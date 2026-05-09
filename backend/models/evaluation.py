from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.evaluation import EvaluationBase

class EvaluationInDB(EvaluationBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    evaluatedAt: datetime = Field(default_factory=datetime.utcnow, alias="evaluatedAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
