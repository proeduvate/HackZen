from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamMemberRole,
    TeamResponse,
    TeamMemberResponse,
    TeamMentorUpdate,
)
from models.team import TeamInDB, TeamMemberInDB
from schemas.application import ApplicationStatus
from core.security import generate_team_invite_code

router = APIRouter()


def get_team_collection():
    return get_db()["teams"]


def get_team_members_collection():
    return get_db()["teamMembers"]


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Create a new team for a hackathon. hackathonId must be the MongoDB _id of the hackathon."""
    db = get_db()
    teams_collection = db["teams"]
    user_id = current_user.get("id") or current_user.get("sub")

    # 0. Validate hackathonId is a valid MongoDB ObjectId and hackathon exists
    if not ObjectId.is_valid(team_data.hackathonId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hackathonId format. Must be a valid MongoDB ObjectId (the _id of the hackathon).",
        )

    hackathon = await db["hackathons"].find_one(
        {"_id": ObjectId(team_data.hackathonId)}
    )
    if not hackathon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found. Make sure you are using the original MongoDB _id of the hackathon.",
        )

    # TODO: Re-enable enrollment check once application approval flow is built
    # app_collection = db["applications"]
    # enrollment = await app_collection.find_one({
    #     "hackathonId": team_data.hackathonId,
    #     "userId": user_id,
    #     "status": ApplicationStatus.APPROVED.value
    # })
    # if not enrollment:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You must enroll in the hackathon first before creating a team"
    #     )

    # 2. Check if user is already in a team for this hackathon
    members_collection = get_team_members_collection()
    user_memberships = await members_collection.find({"userId": user_id}).to_list(100)
    user_team_ids = []
    for m in user_memberships:
        try:
            user_team_ids.append(ObjectId(m["teamId"]))
        except:
            continue

    existing_team = await teams_collection.find_one(
        {"_id": {"$in": user_team_ids}, "hackathonId": team_data.hackathonId}
    )

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team in this hackathon",
        )

    # Check if team name already taken for this hackathon
    existing = await teams_collection.find_one(
        {"hackathonId": team_data.hackathonId, "teamName": team_data.teamName}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Team name already exists"
        )

    # Get user name for createdBy
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user_name = user.get("name", "Unknown Student") if user else "Unknown Student"

    team_dict = team_data.model_dump(by_alias=True)
    team_dict["createdBy"] = user_name
    team_dict["leaderId"] = user_id
    team_dict["createdAt"] = datetime.utcnow()

    # Generate unique team code with retry (in case of collision)
    max_retries = 10
    for attempt in range(max_retries):
        team_dict["teamCode"] = generate_team_invite_code()
        try:
            result = await teams_collection.insert_one(team_dict)
            team_dict["_id"] = str(result.inserted_id)
            break
        except Exception as e:
            if "E11000" in str(e):
                if "teamName" in str(e):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A team with this name already exists in this hackathon",
                    )
                if "teamCode" in str(e) and attempt < max_retries - 1:
                    continue
            raise

    # Add creator as leader
    leader_member = {
        "teamId": team_dict["_id"],
        "userId": user_id,
        "role": TeamMemberRole.LEADER.value,
        "joinedAt": datetime.utcnow(),
    }
    await members_collection.insert_one(leader_member)

    # Create initial progress record
    progress_collection = db["progress"]
    stages_collection = db["stages"]
    stages = (
        await stages_collection.find({"hackathonId": team_data.hackathonId})
        .sort("stageOrder", 1)
        .to_list(1)
    )
    first_stage_id = str(stages[0]["_id"]) if stages else "initial"

    progress_data = {
        "hackathonId": team_data.hackathonId,
        "teamId": team_dict["_id"],
        "currentStageId": first_stage_id,
        "status": "not-started",
        "lastUpdated": datetime.utcnow(),
    }
    await progress_collection.insert_one(progress_data)

    return TeamResponse(**team_dict)


# ===== IMPORTANT: /my-teams MUST come BEFORE /{team_id} =====
# Otherwise FastAPI treats "my-teams" as a team_id parameter


@router.get("/my-teams", response_model=List[TeamResponse])
@router.get("/my", response_model=List[TeamResponse])
async def get_my_teams(current_user: dict = Depends(with_auth)):
    """Get all teams where the current user is a member"""
    user_id = current_user.get("id") or current_user.get("sub")
    members_collection = get_team_members_collection()
    cursor = members_collection.find({"userId": user_id})
    memberships = await cursor.to_list(100)

    team_ids = [ObjectId(m["teamId"]) for m in memberships]

    if not team_ids:
        return []

    teams_collection = get_team_collection()
    cursor = teams_collection.find({"_id": {"$in": team_ids}})
    teams = await cursor.to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])

    return [TeamResponse(**team) for team in teams]


@router.get("/mentor-teams", response_model=List[TeamResponse])
async def get_mentor_teams(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Get all teams assigned to the current mentor"""
    user_id = current_user.get("id") or current_user.get("sub")
    teams_collection = get_team_collection()

    # In the current schema, team has mentorId field
    cursor = teams_collection.find({"mentorId": user_id})
    teams = await cursor.to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])

    return [TeamResponse(**team) for team in teams]


@router.get("/mentor/my", response_model=List[TeamResponse])
async def get_mentor_teams_list(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Get all teams mentored by the current mentor"""
    user_id = current_user.get("id") or current_user.get("sub")
    teams_collection = get_team_collection()
    cursor = teams_collection.find({"mentorId": user_id})
    teams = await cursor.to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])

    return [TeamResponse(**team) for team in teams]


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str):
    """Get team details by team ID"""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    collection = get_team_collection()
    team = await collection.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    team["_id"] = str(team["_id"])
    return TeamResponse(**team)


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(team_id: str):
    """Get all members of a team"""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    members_collection = get_team_members_collection()
    cursor = members_collection.find({"teamId": team_id})
    members = await cursor.to_list(100)

    for member in members:
        member["_id"] = str(member["_id"])

    return [TeamMemberResponse(**member) for member in members]


@router.post("/join/{team_id_or_code}", response_model=TeamMemberResponse)
async def join_team(team_id_or_code: str, current_user: dict = Depends(with_auth)):
    """Join a team using its numeric team code or Team ID"""
    db = get_db()
    teams_collection = db["teams"]
    user_id = current_user.get("id") or current_user.get("sub")

    # Try finding by teamCode first
    team = await teams_collection.find_one({"teamCode": team_id_or_code})

    # If not found by code, try finding by _id
    if not team and ObjectId.is_valid(team_id_or_code):
        team = await teams_collection.find_one({"_id": ObjectId(team_id_or_code)})

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found with the provided ID or Code",
        )

    hackathon_id = team["hackathonId"]

    # TODO: Re-enable enrollment check once application approval flow is built
    # app_collection = db["applications"]
    # enrollment = await app_collection.find_one({
    #     "hackathonId": hackathon_id,
    #     "userId": user_id,
    #     "status": ApplicationStatus.APPROVED.value
    # })
    # if not enrollment:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You must enroll in the hackathon first before joining a team"
    #     )

    # 2. Check if user is already in a team for this hackathon
    members_collection = get_team_members_collection()
    user_memberships = await members_collection.find({"userId": user_id}).to_list(100)
    user_team_ids = []
    for m in user_memberships:
        try:
            user_team_ids.append(ObjectId(m["teamId"]))
        except:
            continue

    existing_team = await teams_collection.find_one(
        {"_id": {"$in": user_team_ids}, "hackathonId": hackathon_id}
    )

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team in this hackathon",
        )

    # 3. Check if team is full - look up hackathon by MongoDB _id
    current_members_count = await members_collection.count_documents(
        {"teamId": str(team["_id"])}
    )

    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})

    max_size = hackathon.get("maxTeamSize", 4) if hackathon else 4

    if current_members_count >= max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Team is already full"
        )

    new_member = {
        "teamId": str(team["_id"]),
        "userId": user_id,
        "role": TeamMemberRole.MEMBER.value,
        "joinedAt": datetime.utcnow(),
    }
    result = await members_collection.insert_one(new_member)
    new_member["_id"] = str(result.inserted_id)

    return TeamMemberResponse(**new_member)


@router.post("/{team_id}/assign-mentor", response_model=TeamResponse)
async def assign_mentor(
    team_id: str, mentor_data: TeamMentorUpdate, current_user: dict = Depends(with_auth)
):
    """Assign a mentor to a team (One mentor per team, Team Leader only)"""
    db = get_db()
    teams_collection = db["teams"]
    user_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    team = await teams_collection.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Check if team already has a mentor
    if team.get("mentorId"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team already has a mentor assigned",
        )

    # Check if current user is the team leader
    members_collection = db["teamMembers"]
    membership = await members_collection.find_one(
        {"teamId": team_id, "userId": user_id, "role": TeamMemberRole.LEADER.value}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can assign a mentor",
        )

    # Verify the mentor exists
    mentor = await db["mentors"].find_one({"userId": mentor_data.mentorId})
    if not mentor:
        try:
            mentor = await db["mentors"].find_one(
                {"_id": ObjectId(mentor_data.mentorId)}
            )
        except:
            pass

        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found or is not available",
            )

    mentor_user_id = str(mentor["userId"])

    # Update team with mentorId
    await teams_collection.update_one(
        {"_id": ObjectId(team_id)}, {"$set": {"mentorId": mentor_user_id}}
    )

    updated_team = await teams_collection.find_one({"_id": ObjectId(team_id)})
    updated_team["_id"] = str(updated_team["_id"])
    return TeamResponse(**updated_team)


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str, user_id: str, current_user: dict = Depends(with_auth)
):
    """Remove a member from the team (Team Leader only)"""
    db = get_db()
    current_user_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    # 1. Verify team exists
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # 2. Verify current user is the team leader
    members_coll = db["teamMembers"]
    leader_membership = await members_coll.find_one(
        {
            "teamId": team_id,
            "userId": current_user_id,
            "role": TeamMemberRole.LEADER.value,
        }
    )

    if not leader_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can remove members",
        )

    # 3. Cannot remove yourself (the leader) - must delete team instead
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team leader cannot remove themselves. Delete the team instead.",
        )

    # 4. Remove the member
    result = await members_coll.delete_one({"teamId": team_id, "userId": user_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this team",
        )

    return None


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: str, current_user: dict = Depends(with_auth)):
    """Delete the entire team (Team Leader or Admin only)"""
    db = get_db()
    current_user_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    team_oid = ObjectId(team_id)
    team = await db["teams"].find_one({"_id": team_oid})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # 2. Check permissions (Leader or Admin)
    is_admin = current_user.get("role") == "admin"

    leader_membership = None
    if not is_admin:
        leader_membership = await db["teamMembers"].find_one(
            {
                "teamId": team_id,
                "userId": current_user_id,
                "role": TeamMemberRole.LEADER.value,
            }
        )

    if not is_admin and not leader_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader or an admin can delete the team",
        )

    # 3. Delete all team members
    await db["teamMembers"].delete_many({"teamId": team_id})

    # 4. Delete progress records
    await db["progress"].delete_many({"teamId": team_id})

    # 5. Delete the team itself
    await db["teams"].delete_one({"_id": team_oid})

    return None
