from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationStatus
from models.application import ApplicationInDB

router = APIRouter()

def get_application_collection():
    return get_db()["applications"]

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_data: ApplicationCreate,
    current_user: dict = Depends(RequireRole(["student"]))
):
    """Apply for a hackathon"""
    
    collection = get_application_collection()
    
    # Check if already applied
    # Using camelCase as per initialized schema
    existing = await collection.find_one({
        "hackathonId": app_data.hackathonId,
        "userId": current_user["sub"]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this hackathon"
        )
    
    app_dict = app_data.model_dump(by_alias=True)
    app_dict["userId"] = current_user["sub"]
    app_dict["status"] = ApplicationStatus.PENDING.value
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
    hackathon_id: str, 
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get all applications for a hackathon (Organizer only)"""
        
    collection = get_application_collection()
    cursor = collection.find({"hackathonId": hackathon_id})
    apps = await cursor.to_list(1000)
    
    for app in apps:
        app["_id"] = str(app["_id"])
        
    return [ApplicationResponse(**app) for app in apps]
