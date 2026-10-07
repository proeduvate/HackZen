from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from schemas.progress import (
    TeamProgressResponse,
    TeamProgressUpdate,
    ProgressStatus,
    MilestoneProgressResponse,
    MilestoneProgressCreate,
)
from models.progress import TeamProgressInDB, MilestoneProgressInDB

router = APIRouter()


def get_progress_collection():
    return get_db()["progress"]


def get_milestone_progress_collection():
    return get_db()["milestoneProgress"]


async def sync_progress_from_milestones(progress_id: str) -> None:
    """Recalculate a team's progress whenever a milestone is changed.

    The percentage is derived from stored milestone completion records, rather
    than from a client supplied value. A history point is saved only when the
    calculated percentage actually changes.
    """
    db = get_db()
    progress_collection = get_progress_collection()
    progress = await progress_collection.find_one({"_id": ObjectId(progress_id)})
    if not progress:
        return

    stages = await db["stages"].find({"hackathonId": progress["hackathonId"]}).to_list(1000)
    stage_ids = [str(stage["_id"]) for stage in stages]
    milestones = await db["milestones"].find({"stageId": {"$in": stage_ids}}).to_list(1000) if stage_ids else []
    milestone_ids = [str(milestone["_id"]) for milestone in milestones]

    completion_query = {"progressId": progress_id, "completed": True}
    if milestone_ids:
        completion_query["milestoneId"] = {"$in": milestone_ids}
        total = len(milestone_ids)
    else:
        # Some older events do not have configured milestone definitions. In
        # that case, use their real tracked milestones as the task set.
        total = await get_milestone_progress_collection().count_documents({"progressId": progress_id})

    completed = await get_milestone_progress_collection().count_documents(completion_query)
    percentage = round((completed / total) * 100) if total else 0
    current_percentage = int(progress.get("percentage", 0))
    now = datetime.utcnow()
    update = {"percentage": percentage, "lastUpdated": now}
    if percentage == 0:
        update["status"] = ProgressStatus.NOT_STARTED.value
    elif percentage == 100:
        update["status"] = ProgressStatus.COMPLETED.value
    else:
        update["status"] = ProgressStatus.IN_PROGRESS.value

    operations = {"$set": update}
    if percentage != current_percentage:
        operations["$push"] = {"progressHistory": {"percentage": percentage, "updatedAt": now}}
    await progress_collection.update_one({"_id": progress["_id"]}, operations)


@router.get("/team/{team_id}", response_model=TeamProgressResponse)
async def get_team_progress(team_id: str, current_user: dict = Depends(with_auth)):
    """Get progress tracking for a specific team"""
    progress_collection = get_progress_collection()

    # Get progress
    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        # For initialization, we need hackathonId. Let's find the team.
        teams_collection = get_db()["teams"]
        team = await teams_collection.find_one({"_id": ObjectId(team_id)})
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )

        # Get first stage of hackathon if possible
        hackathons_collection = get_db()["hackathons"]
        hackathon = await hackathons_collection.find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )

        # Get stages
        stages_collection = get_db()["stages"]
        stages = (
            await stages_collection.find({"hackathonId": team["hackathonId"]})
            .sort("stageOrder", 1)
            .to_list(1)
        )
        first_stage_id = str(stages[0]["_id"]) if stages else "initial"

        progress_data = {
            "hackathonId": team["hackathonId"],
            "teamId": team_id,
            "currentStageId": first_stage_id,
            "status": ProgressStatus.NOT_STARTED.value,
            "percentage": 0,
            "progressHistory": [],
            "lastUpdated": datetime.utcnow(),
        }

        result = await progress_collection.insert_one(progress_data)
        progress_data["_id"] = str(result.inserted_id)
        progress = progress_data

    # Keep legacy team records compatible with the current progress response.
    progress.setdefault("percentage", 0)
    progress.setdefault("progressHistory", [])
    progress["_id"] = str(progress["_id"])
    return TeamProgressResponse(**progress)


@router.put("/team/{team_id}", response_model=TeamProgressResponse)
async def update_team_progress(
    team_id: str,
    update_data: TeamProgressUpdate,
    current_user: dict = Depends(with_auth),
):
    """Update team progress status"""
    progress_collection = get_progress_collection()

    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Progress record not found"
        )

    update_dict = update_data.model_dump(exclude_unset=True, by_alias=True)
    updated_at = datetime.utcnow()
    update_dict["lastUpdated"] = updated_at
    operations = {"$set": update_dict}
    # Keep a point for every explicit percentage entry so dashboards can show
    # progress by day instead of fabricating a trend from the current value.
    if "percentage" in update_dict:
        operations["$push"] = {"progressHistory": {"percentage": update_dict["percentage"], "updatedAt": updated_at}}

    await progress_collection.update_one({"teamId": team_id}, operations)

    updated_progress = await progress_collection.find_one({"teamId": team_id})
    updated_progress.setdefault("percentage", 0)
    updated_progress.setdefault("progressHistory", [])
    updated_progress["_id"] = str(updated_progress["_id"])

    return TeamProgressResponse(**updated_progress)


@router.post("/milestone", response_model=MilestoneProgressResponse)
async def create_milestone_progress(
    milestone_data: MilestoneProgressCreate, current_user: dict = Depends(with_auth)
):
    """Mark a milestone as completed/verified"""
    collection = get_milestone_progress_collection()

    # Check if already exists
    existing = await collection.find_one(
        {
            "progressId": milestone_data.progress_id,
            "milestoneId": milestone_data.milestone_id,
        }
    )

    if existing:
        # Update existing
        update_dict = milestone_data.model_dump(by_alias=True)
        if milestone_data.completed:
            update_dict["verifiedAt"] = datetime.utcnow()
            update_dict["verifiedBy"] = current_user["sub"]

        await collection.update_one({"_id": existing["_id"]}, {"$set": update_dict})
        await sync_progress_from_milestones(milestone_data.progress_id)
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
    await sync_progress_from_milestones(milestone_data.progress_id)

    return MilestoneProgressResponse(**doc)


@router.put("/milestones/{milestone_progress_id}", response_model=MilestoneProgressResponse)
async def update_milestone_progress(
    milestone_progress_id: str,
    completed: bool = Body(..., embed=True),
    current_user: dict = Depends(with_auth),
):
    """Update a tracked task and immediately refresh its team's percentage."""
    if not ObjectId.is_valid(milestone_progress_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid milestone progress ID")

    collection = get_milestone_progress_collection()
    existing = await collection.find_one({"_id": ObjectId(milestone_progress_id)})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone progress not found")

    update = {"completed": completed}
    if completed:
        update.update({"verifiedAt": datetime.utcnow(), "verifiedBy": current_user["sub"]})
    else:
        update.update({"verifiedAt": None, "verifiedBy": None})
    await collection.update_one({"_id": existing["_id"]}, {"$set": update})
    existing.update(update)
    await sync_progress_from_milestones(existing["progressId"])
    existing["_id"] = str(existing["_id"])
    return MilestoneProgressResponse(**existing)


@router.get("/milestones/{progress_id}", response_model=List[MilestoneProgressResponse])
async def get_milestones_progress(progress_id: str):
    """Get all milestone progress for a team's progress record"""
    collection = get_milestone_progress_collection()
    cursor = collection.find({"progressId": progress_id})
    docs = await cursor.to_list(100)

    for doc in docs:
        doc["_id"] = str(doc["_id"])

    return [MilestoneProgressResponse(**doc) for doc in docs]
