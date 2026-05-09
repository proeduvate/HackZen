from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from schemas.progress import TeamProgressResponse, TeamProgressUpdate, ProgressStatus, MilestoneProgressResponse, MilestoneProgressCreate
from models.progress import TeamProgressInDB, MilestoneProgressInDB

router = APIRouter()

def get_progress_collection():
    return get_db()["progress"]

def get_milestone_progress_collection():
    return get_db()["milestoneProgress"]

@router.get("/team/{team_id}", response_model=TeamProgressResponse)
async def get_team_progress(
    team_id: str,
    current_user: dict = Depends(with_auth)
):
    """Get progress tracking for a specific team"""
    progress_collection = get_progress_collection()
    
    # Get progress
    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        # For initialization, we need hackathonId. Let's find the team.
        teams_collection = get_db()["teams"]
        team = await teams_collection.find_one({"_id": ObjectId(team_id)})
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        
        # Get first stage of hackathon if possible
        hackathons_collection = get_db()["hackathons"]
        hackathon = await hackathons_collection.find_one({"_id": ObjectId(team["hackathonId"])})
        
        # Get stages
        stages_collection = get_db()["stages"]
        stages = await stages_collection.find({"hackathonId": team["hackathonId"]}).sort("stageOrder", 1).to_list(1)
        first_stage_id = str(stages[0]["_id"]) if stages else "initial"

        progress_data = {
            "hackathonId": team["hackathonId"],
            "teamId": team_id,
            "currentStageId": first_stage_id,
            "status": ProgressStatus.NOT_STARTED.value,
            "lastUpdated": datetime.utcnow()
        }
        
        result = await progress_collection.insert_one(progress_data)
        progress_data["_id"] = str(result.inserted_id)
        progress = progress_data
    
    progress["_id"] = str(progress["_id"])
    return TeamProgressResponse(**progress)

@router.put("/team/{team_id}", response_model=TeamProgressResponse)
async def update_team_progress(
    team_id: str,
    update_data: TeamProgressUpdate,
    current_user: dict = Depends(with_auth)
):
    """Update team progress status"""
    progress_collection = get_progress_collection()
    
    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress record not found")
    
    update_dict = update_data.model_dump(exclude_unset=True, by_alias=True)
    update_dict["lastUpdated"] = datetime.utcnow()
    
    await progress_collection.update_one(
        {"teamId": team_id},
        {"$set": update_dict}
    )
    
    updated_progress = await progress_collection.find_one({"teamId": team_id})
    updated_progress["_id"] = str(updated_progress["_id"])
    
    return TeamProgressResponse(**updated_progress)

@router.post("/milestone", response_model=MilestoneProgressResponse)
async def create_milestone_progress(
    milestone_data: MilestoneProgressCreate,
    current_user: dict = Depends(with_auth)
):
    """Mark a milestone as completed/verified"""
    collection = get_milestone_progress_collection()
    
    # Check if already exists
    existing = await collection.find_one({
        "progressId": milestone_data.progress_id,
        "milestoneId": milestone_data.milestone_id
    })
    
    if existing:
        # Update existing
        update_dict = milestone_data.model_dump(by_alias=True)
        if milestone_data.completed:
            update_dict["verifiedAt"] = datetime.utcnow()
            update_dict["verifiedBy"] = current_user["sub"]
            
        await collection.update_one({"_id": existing["_id"]}, {"$set": update_dict})
        existing.update(update_dict)
        existing["_id"] = str(existing["_id"])
        return MilestoneProgressResponse(**existing)
    
    # Create new
    doc = milestone_data.model_dump(by_alias=True)
    if milestone_data.completed:
        doc["verifiedAt"] = datetime.utcnow()
        doc["verifiedBy"] = current_user["sub"]
        
    result = await collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    
    return MilestoneProgressResponse(**doc)

@router.get("/milestones/{progress_id}", response_model=List[MilestoneProgressResponse])
async def get_milestones_progress(progress_id: str):
    """Get all milestone progress for a team's progress record"""
    collection = get_milestone_progress_collection()
    cursor = collection.find({"progressId": progress_id})
    docs = await cursor.to_list(100)
    
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        
    return [MilestoneProgressResponse(**doc) for doc in docs]
