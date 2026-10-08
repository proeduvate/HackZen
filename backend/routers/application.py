from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationStatus,
)
from models.application import ApplicationInDB

router = APIRouter()


def get_application_collection():
    return get_db()["applications"]


@router.get("/check/{hackathon_id}")
async def check_application_eligibility(
    hackathon_id: str, current_user: dict = Depends(with_auth)
):
    """Check if the student can register for this hackathon or is already registered/expired."""
    db = get_db()
    current_user_id = str(current_user.get("sub") or current_user.get("id"))

    # 1. Fetch hackathon
    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        hackathon = await db["hackathons"].find_one({"id": hackathon_id})
    if not hackathon:
        return {
            "registered": False,
            "expired": False,
            "canRegister": False,
            "reason": "Hackathon not found",
        }

    # 2. Check if already applied
    existing_app = await db["applications"].find_one(
        {"hackathonId": hackathon_id, "userId": current_user_id}
    )
    if existing_app:
        return {
            "registered": True,
            "expired": False,
            "canRegister": False,
            "reason": "Already registered for this hackathon",
            "applicationId": str(existing_app["_id"]),
            "teamId": existing_app.get("teamId"),
        }

    # 3. Check if hackathon deadline has passed or status is closed
    now = datetime.utcnow()
    is_expired = False
    reg_end = hackathon.get("registrationDeadline") or hackathon.get("hackathonEnd") or hackathon.get("endDate")
    if reg_end and isinstance(reg_end, datetime) and reg_end < now:
        is_expired = True
    elif reg_end and isinstance(reg_end, str):
        try:
            reg_date = datetime.fromisoformat(reg_end.replace("Z", "+00:00")).replace(tzinfo=None)
            if reg_date < now:
                is_expired = True
        except Exception:
            pass

    status_str = str(hackathon.get("status", "")).lower()
    if status_str in ["completed", "closed", "draft", "results announced"]:
        is_expired = True

    if is_expired:
        return {
            "registered": False,
            "expired": True,
            "canRegister": False,
            "reason": "Registrations for this hackathon have closed",
        }

    return {
        "registered": False,
        "expired": False,
        "canRegister": True,
        "reason": "Eligible to register",
    }


@router.post(
    "/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    app_data: ApplicationCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Apply for a hackathon with team registration and duplicate/expired protection."""
    db = get_db()
    current_user_id = str(current_user.get("sub") or current_user.get("id"))
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated student user is missing from the token.",
        )

    # 1. Validate hackathon exists and is accepting registrations
    hackathon = None
    if ObjectId.is_valid(app_data.hackathonId):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(app_data.hackathonId)})
    if not hackathon:
        hackathon = await db["hackathons"].find_one({"id": app_data.hackathonId})
    if not hackathon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found.",
        )

    now = datetime.utcnow()
    reg_end = hackathon.get("registrationDeadline") or hackathon.get("hackathonEnd") or hackathon.get("endDate")
    if reg_end and isinstance(reg_end, datetime) and reg_end < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration for this hackathon has expired.",
        )
    elif reg_end and isinstance(reg_end, str):
        try:
            reg_date = datetime.fromisoformat(reg_end.replace("Z", "+00:00")).replace(tzinfo=None)
            if reg_date < now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration for this hackathon has expired.",
                )
        except Exception:
            pass

    status_str = str(hackathon.get("status", "")).lower()
    if status_str in ["completed", "closed", "draft", "results announced"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This hackathon is no longer accepting registrations.",
        )

    # 2. Check for duplicate registration
    collection = get_application_collection()
    existing = await collection.find_one(
        {"hackathonId": app_data.hackathonId, "userId": current_user_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this hackathon.",
        )

    # 3. Create or associate team if teamName is provided
    created_team_id = app_data.teamId
    if not created_team_id and app_data.teamName and app_data.teamName.strip():
        # Auto-create team for this hackathon
        clean_team_name = app_data.teamName.strip()
        team_doc = {
            "teamName": clean_team_name,
            "hackathonId": app_data.hackathonId,
            "leaderId": current_user_id,
            "teamSize": app_data.teamSize or 2,
            "notes": app_data.notes or "",
            "invitedEmails": app_data.memberEmails or [],
            "status": "active",
            "createdAt": datetime.utcnow(),
        }
        team_res = await db["teams"].insert_one(team_doc)
        created_team_id = str(team_res.inserted_id)

        # Add user as team leader in teamMembers collection
        await db["teamMembers"].insert_one(
            {
                "teamId": created_team_id,
                "userId": current_user_id,
                "role": "leader",
                "joinedAt": datetime.utcnow(),
            }
        )

    app_dict = app_data.model_dump(by_alias=True)
    app_dict["userId"] = current_user_id
    app_dict["teamId"] = created_team_id
    app_dict["status"] = ApplicationStatus.APPROVED.value
    app_dict["appliedAt"] = datetime.utcnow()

    result = await collection.insert_one(app_dict)
    app_dict["_id"] = str(result.inserted_id)

    return ApplicationResponse(**app_dict)


@router.get("/my", response_model=List[ApplicationResponse])
async def get_my_applications(current_user: dict = Depends(with_auth)):
    """Get all applications by current user"""
    collection = get_application_collection()
    cursor = collection.find({"userId": current_user["sub"]}).sort("appliedAt", -1)
    apps = await cursor.to_list(100)

    for app in apps:
        app["_id"] = str(app["_id"])

    return [ApplicationResponse(**app) for app in apps]


@router.get("/hackathon/{hackathon_id}", response_model=List[ApplicationResponse])
async def get_hackathon_applications(
    hackathon_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get all applications for a hackathon (Organizer only)"""

    collection = get_application_collection()
    cursor = collection.find({"hackathonId": hackathon_id})
    apps = await cursor.to_list(1000)

    for app in apps:
        app["_id"] = str(app["_id"])

    return [ApplicationResponse(**app) for app in apps]
