from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from bson import ObjectId
from pydantic import BaseModel, Field
from schemas.user import ExpertiseArea

class MentorStatus(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    BUSY = "busy"
    UNAVAILABLE = "unavailable"
    ON_LEAVE = "on_leave"

class MentorAllocationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class MentorAllocationRequest(BaseModel):
    teamId: str = Field(..., alias="teamId")
    hackathonId: str = Field(..., alias="hackathonId")
    requestedBy: str = Field(..., alias="requestedBy")
    requestedAt: datetime = Field(default_factory=datetime.utcnow, alias="requestedAt")
    requiredExpertise: List[ExpertiseArea] = Field(default=[], alias="requiredExpertise")
    preferredMentorId: Optional[str] = Field(None, alias="preferredMentorId")
    teamRequirements: Dict[str, Any] = Field(default={}, alias="teamRequirements")
    status: MentorAllocationStatus = MentorAllocationStatus.PENDING
    rejectionReason: Optional[str] = Field(None, alias="rejectionReason")
    assignedMentorId: Optional[str] = Field(None, alias="assignedMentorId")
    assignedAt: Optional[datetime] = Field(None, alias="assignedAt")
    assignedBy: Optional[str] = Field(None, alias="assignedBy")

class MentorAllocation(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    mentorId: str = Field(..., alias="mentorId")
    teamId: str = Field(..., alias="teamId")
    hackathonId: str = Field(..., alias="hackathonId")
    allocatedBy: str = Field(..., alias="allocatedBy")
    allocatedAt: datetime = Field(default_factory=datetime.utcnow, alias="allocatedAt")
    status: MentorAllocationStatus = MentorAllocationStatus.PENDING
    mentorAccepted: Optional[bool] = Field(None, alias="mentorAccepted")
    mentorAcceptedAt: Optional[datetime] = Field(None, alias="mentorAcceptedAt")
    mentorRejectedReason: Optional[str] = Field(None, alias="mentorRejectedReason")
    startDate: Optional[datetime] = Field(None, alias="startDate")
    endDate: Optional[datetime] = Field(None, alias="endDate")
    meetingSchedule: List[Dict[str, Any]] = Field(default=[], alias="meetingSchedule")
    totalMeetings: int = Field(default=0, alias="totalMeetings")
    completedMeetings: int = Field(default=0, alias="completedMeetings")
    feedbackGiven: bool = Field(default=False, alias="feedbackGiven")
    teamFeedback: Optional[str] = Field(None, alias="teamFeedback")
    mentorFeedback: Optional[str] = Field(None, alias="mentorFeedback")
    rating: Optional[float] = Field(None, alias="rating")

class MentorProfile(BaseModel):
    userId: str = Field(..., alias="userId")
    headline: Optional[str] = None
    bio: Optional[str] = None
    yearsOfExperience: int = Field(default=0, alias="yearsOfExperience")
    currentPosition: Optional[str] = Field(None, alias="currentPosition")
    company: Optional[str] = None
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")
    portfolioUrl: Optional[str] = Field(None, alias="portfolioUrl")
    expertiseAreas: List[ExpertiseArea] = Field(default=[], alias="expertiseAreas")
    technologies: List[str] = []
    languages: List[str] = []
    availabilityStatus: MentorStatus = Field(default=MentorStatus.AVAILABLE, alias="availabilityStatus")
    totalHackathonsMentored: int = Field(default=0, alias="totalHackathonsMentored")
    averageRating: float = Field(default=0.0, alias="averageRating")
    totalReviews: int = Field(default=0, alias="totalReviews")
