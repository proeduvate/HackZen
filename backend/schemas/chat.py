from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    CHECKPOINT = "checkpoint"
    DECISION = "decision"
    MENTOR_FEEDBACK = "mentor_feedback"


class ChatMessageBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    senderId: str = Field(..., alias="senderId")
    senderName: Optional[str] = Field(None, alias="senderName")
    messageType: MessageType = Field(MessageType.TEXT, alias="messageType")
    content: str
    isCheckpoint: bool = Field(False, alias="isCheckpoint")

    class Config:
        populate_by_name = True


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: str = Field(..., alias="_id")
    createdAt: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True
