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
    MentorRequestCreate,
    MentorRequestDecision,
)
from models.team import TeamInDB, TeamMemberInDB
from schemas.application import ApplicationStatus
from core.security import generate_team_invite_code

router = APIRouter()


def get_team_collection():
    return get_db()["teams"]


def get_team_members_collection():
    return get_db()["teamMembers"]


async def _require_leader(db, team_id: str, user_id: str):
    membership = await db["teamMembers"].find_one(
        {"teamId": team_id, "userId": user_id, "role": TeamMemberRole.LEADER.value}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Only the team lead can perform this action")


async def _notify(db, user_id: str, notification_type: str, message: str, hackathon_id: str = None):
    await db["notifications"].insert_one({
        "userId": user_id, "hackathonId": hackathon_id, "type": notification_type,
        "message": message, "read": False, "createdAt": datetime.utcnow(),
    })


def _match_terms(values):
    """Normalize profile/domain values for the deterministic AI-match score."""
    terms = set()
    for value in values:
        if isinstance(value, str):
            terms.update(part.strip().lower() for part in value.replace("/", " ").replace(",", " ").split() if part.strip())
    return terms


async def _offer_ai_mentor_match(db, team: dict, excluded_ids=None):
    """Offer a team to the best available mentor; never assign without acceptance."""
    excluded_ids = set(excluded_ids or team.get("mentorMatchExcludedIds", []))
    hackathon = None
    if ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
    team_terms = _match_terms([
        team.get("domain", ""), team.get("description", ""),
        *(team.get("requiredSkills", []) or []), *((hackathon or {}).get("themes", []) or []),
    ])
    candidates = []
    async for mentor in db["mentors"].find({"availability": "Available"}):
        mentor_id = mentor.get("userId")
        if not mentor_id or mentor_id in excluded_ids:
            continue
        expertise = _match_terms([
            *(mentor.get("expertiseDomains", []) or []), *(mentor.get("skills", []) or []),
            *(mentor.get("technologies", []) or []), mentor.get("bio", ""),
        ])
        overlap = len(team_terms & expertise)
        workload = await db["teams"].count_documents({"mentorId": mentor_id})
        # Domain/skill relevance dominates; workload only breaks otherwise close matches.
        score = overlap * 30 + min(int(mentor.get("experienceYears", 0) or 0), 20) - workload * 5
        candidates.append((score, workload, mentor_id, overlap))

    if not candidates:
        await db["teams"].update_one({"_id": team["_id"]}, {"$set": {"mentorRequestStatus": "no-match"}})
        return None

    score, _, mentor_id, overlap = sorted(candidates, key=lambda item: (-item[0], item[1], item[2]))[0]
    now = datetime.utcnow()
    request = {
        "teamId": str(team["_id"]), "mentorId": mentor_id,
        "requestedBy": "ai-matcher", "message": "AI mentor match awaiting your decision.",
        "status": "pending", "source": "ai-match", "matchScore": score,
        "matchReason": f"Matched {overlap} domain/skill signal(s)", "createdAt": now,
    }
    result = await db["mentorRequests"].insert_one(request)
    await db["teams"].update_one({"_id": team["_id"]}, {"$set": {
        "mentorRequestStatus": "ai-matched", "lastMatchedMentorId": mentor_id, "mentorMatchUpdatedAt": now,
    }})
    await _notify(db, mentor_id, "mentor_ai_match", f"AI matched you with {team.get('teamName', 'a team')}. Please accept or reject.", team.get("hackathonId"))
    request["_id"] = str(result.inserted_id)
    return request


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
    # The client always submits the canonical event ID.  Persist the title as
    # display metadata so every team view can show both the name and ID.
    team_dict["hackathonName"] = hackathon.get("title", "Hackathon")
    team_dict["createdBy"] = user_name
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
        "percentage": 0,
        "progressHistory": [],
        "lastUpdated": datetime.utcnow(),
    }
    await progress_collection.insert_one(progress_data)

    # The team is automatically offered to the best available mentor. The
    # mentor must still accept before mentorId is assigned.
    await _offer_ai_mentor_match(db, team_dict)

    return TeamResponse(**team_dict)


# ===== IMPORTANT: /my-teams MUST come BEFORE /{team_id} =====
# Otherwise FastAPI treats "my-teams" as a team_id parameter


@router.get("/my-teams", response_model=List[TeamResponse])
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
    db = get_db()
    teams_collection = db["teams"]

    # In the current schema, team has mentorId field
    cursor = teams_collection.find({"mentorId": user_id})
    teams = await cursor.to_list(100)

    progress_collection = db["progress"]
    members_collection = db["teamMembers"]
    for team in teams:
        team["_id"] = str(team["_id"])
        if not team.get("hackathonName") and ObjectId.is_valid(team.get("hackathonId", "")):
            hackathon = await get_db()["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
            if hackathon:
                team["hackathonName"] = hackathon.get("title")
        team["memberCount"] = await members_collection.count_documents({"teamId": team["_id"]})
        progress = await progress_collection.find_one({"teamId": team["_id"]})
        team["progress"] = int((progress or {}).get("percentage", 0))
        team["currentStage"] = (progress or {}).get("currentStage")

    return [TeamResponse(**team) for team in teams]


@router.get("/mentor/my", response_model=List[TeamResponse])
async def get_mentor_teams_list(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Get all teams mentored by the current mentor"""
    user_id = current_user.get("id") or current_user.get("sub")
    db = get_db()
    teams_collection = db["teams"]
    cursor = teams_collection.find({"mentorId": user_id})
    teams = await cursor.to_list(100)

    progress_collection = db["progress"]
    members_collection = db["teamMembers"]
    for team in teams:
        team["_id"] = str(team["_id"])
        team["memberCount"] = await members_collection.count_documents({"teamId": team["_id"]})
        progress = await progress_collection.find_one({"teamId": team["_id"]})
        team["progress"] = int((progress or {}).get("percentage", 0))
        team["currentStage"] = (progress or {}).get("currentStage")

    return [TeamResponse(**team) for team in teams]


@router.get("/hackathon/{hackathon_id}/feedback")
async def get_hackathon_feedback(
    hackathon_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Return mentor feedback for one event to its organizer or an admin."""
    if not ObjectId.is_valid(hackathon_id):
        raise HTTPException(status_code=400, detail="Invalid hackathon ID")

    db = get_db()
    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin" and hackathon.get("organizerId") != user_id:
        raise HTTPException(status_code=403, detail="You can only manage feedback for your own hackathons")

    teams = await db["teams"].find({"hackathonId": hackathon_id}).to_list(500)
    teams_by_id = {str(team["_id"]): team for team in teams}
    if not teams_by_id:
        return {"success": True, "data": []}

    feedback_items = await db["feedback"].find({
        "teamId": {"$in": list(teams_by_id)},
        "$or": [{"archivedAt": {"$exists": False}}, {"archivedAt": None}],
    }).sort("createdAt", -1).to_list(500)
    user_ids = {item.get("studentId") for item in feedback_items} | {item.get("mentorId") for item in feedback_items}
    user_ids = [item for item in user_ids if item and ObjectId.is_valid(item)]
    users = await db["users"].find({"_id": {"$in": [ObjectId(item) for item in user_ids]}}).to_list(500)
    names = {str(user["_id"]): user.get("name") or user.get("fullName") or "Unknown user" for user in users}

    data = []
    for item in feedback_items:
        team = teams_by_id.get(item.get("teamId"), {})
        data.append({
            "id": str(item["_id"]), "teamId": item.get("teamId"), "teamName": team.get("teamName", "Unknown team"),
            "studentName": names.get(item.get("studentId"), "Student"),
            "mentorName": names.get(item.get("mentorId"), "Mentor"),
            "type": item.get("type", "general"), "title": item.get("title", "Feedback"),
            "content": item.get("content", ""), "rating": item.get("rating"),
            "createdAt": item.get("createdAt"),
        })
    return {"success": True, "data": data}


async def _require_feedback_manager(db, hackathon_id: str, feedback_id: str, current_user: dict):
    if not ObjectId.is_valid(hackathon_id) or not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=400, detail="Invalid hackathon or feedback ID")
    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin" and hackathon.get("organizerId") != user_id:
        raise HTTPException(status_code=403, detail="You can only manage feedback for your own hackathons")
    feedback = await db["feedback"].find_one({"_id": ObjectId(feedback_id)})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    team = await db["teams"].find_one({"_id": ObjectId(feedback.get("teamId", ""))}) \
        if ObjectId.is_valid(feedback.get("teamId", "")) else None
    if not team or team.get("hackathonId") != hackathon_id:
        raise HTTPException(status_code=404, detail="Feedback does not belong to this hackathon")
    return feedback


@router.patch("/hackathon/{hackathon_id}/feedback/{feedback_id}")
async def archive_hackathon_feedback(
    hackathon_id: str, feedback_id: str, archived: bool = Body(True, embed=True),
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Archive or restore a feedback entry. Only event managers can do this."""
    db = get_db()
    await _require_feedback_manager(db, hackathon_id, feedback_id, current_user)
    update = {"archivedAt": datetime.utcnow(), "archivedBy": current_user.get("id") or current_user.get("sub")} if archived else {"archivedAt": None, "archivedBy": None}
    await db["feedback"].update_one({"_id": ObjectId(feedback_id)}, {"$set": update})
    return {"success": True, "archived": archived}


@router.delete("/hackathon/{hackathon_id}/feedback/{feedback_id}")
async def delete_hackathon_feedback(
    hackathon_id: str, feedback_id: str,
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Permanently delete an entry after organizer confirmation."""
    db = get_db()
    await _require_feedback_manager(db, hackathon_id, feedback_id, current_user)
    await db["feedback"].delete_one({"_id": ObjectId(feedback_id)})
    return {"success": True}


@router.get("/discoverable", response_model=List[TeamResponse])
async def get_discoverable_teams(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Return real teams which are currently available for mentorship."""
    db = get_db()
    teams = await db["teams"].find(
        {"$or": [{"mentorId": {"$exists": False}}, {"mentorId": None}, {"mentorId": ""}]}
    ).to_list(100)

    members_collection = db["teamMembers"]
    progress_collection = db["progress"]
    for team in teams:
        team_id = str(team["_id"])
        team["_id"] = team_id
        team["memberCount"] = await members_collection.count_documents({"teamId": team_id})
        progress = await progress_collection.find_one({"teamId": team_id})
        team["progress"] = int((progress or {}).get("percentage", 0))
        team["currentStage"] = (progress or {}).get("currentStage")

        hackathon_id = team.get("hackathonId")
        if hackathon_id and ObjectId.is_valid(hackathon_id):
            hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
            if hackathon:
                team["hackathonTitle"] = hackathon.get("title")
                team["maxSize"] = hackathon.get("maxTeamSize", 4)

    return [TeamResponse(**team) for team in teams]


@router.post("/{team_id}/request-mentor")
async def request_mentor(
    team_id: str, payload: MentorRequestCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Team lead requests a mentor. Assignment only happens after mentor approval."""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format")
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.get("mentorId"):
        raise HTTPException(status_code=409, detail="This team already has a mentor")
    await _require_leader(db, team_id, user_id)

    mentor = await db["mentors"].find_one({"userId": payload.mentorId})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    duplicate = await db["mentorRequests"].find_one({"teamId": team_id, "mentorId": payload.mentorId, "status": "pending"})
    if duplicate:
        raise HTTPException(status_code=409, detail="A request to this mentor is already pending")

    request = {"teamId": team_id, "mentorId": payload.mentorId, "requestedBy": user_id,
               "message": payload.message or "", "status": "pending", "createdAt": datetime.utcnow()}
    result = await db["mentorRequests"].insert_one(request)
    await db["teams"].update_one({"_id": ObjectId(team_id)}, {"$set": {"mentorRequestStatus": "pending"}})
    await _notify(db, payload.mentorId, "mentor_request", f"{team.get('teamName', 'A team')} requested your mentorship.", team.get("hackathonId"))
    return {"id": str(result.inserted_id), "status": "pending", "message": "Mentor request sent"}


@router.get("/mentor/requests")
async def get_mentor_requests(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(pending|approved|rejected)$"),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    track: Optional[str] = Query(None, min_length=1, max_length=100),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(RequireRole(["mentor"]))
):
    """Pending and completed mentorship requests addressed to the signed-in mentor."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    query = {"mentorId": user_id}
    if status_filter:
        query["status"] = status_filter
    if search or track:
        team_query = {}
        if search:
            team_query["$or"] = [
                {"teamName": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        if track:
            team_query["domain"] = {"$regex": track, "$options": "i"}
        team_ids = [str(team["_id"]) async for team in db["teams"].find(team_query, {"_id": 1})]
        query["teamId"] = {"$in": team_ids}
    total = await db["mentorRequests"].count_documents(query)
    requests = await db["mentorRequests"].find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    for item in requests:
        item["_id"] = str(item["_id"])
        team = await db["teams"].find_one({"_id": ObjectId(item["teamId"])})
        item["teamName"] = (team or {}).get("teamName", "Unknown team")
        item["domain"] = (team or {}).get("domain") or "General"
        item["description"] = (team or {}).get("description") or ""
        item["requiredSkills"] = (team or {}).get("requiredSkills", [])
        item["memberCount"] = await db["teamMembers"].count_documents({"teamId": item["teamId"]})
    return {"data": requests, "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}}


@router.get("/mentor/requests/{request_id}")
async def get_mentor_request(request_id: str, current_user: dict = Depends(RequireRole(["mentor"]))):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid request ID")
    db = get_db()
    item = await db["mentorRequests"].find_one({"_id": ObjectId(request_id), "mentorId": current_user.get("id") or current_user.get("sub")})
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentorship request not found")
    team = await db["teams"].find_one({"_id": ObjectId(item["teamId"])}) if ObjectId.is_valid(item.get("teamId", "")) else None
    item["_id"] = str(item["_id"])
    item["teamName"] = (team or {}).get("teamName", "Unknown team")
    item["domain"] = (team or {}).get("domain") or "General"
    item["description"] = (team or {}).get("description") or ""
    item["requiredSkills"] = (team or {}).get("requiredSkills", [])
    item["memberCount"] = await db["teamMembers"].count_documents({"teamId": item["teamId"]})
    return {"data": item}


@router.patch("/mentor/requests/{request_id}")
async def decide_mentor_request(
    request_id: str, payload: MentorRequestDecision, current_user: dict = Depends(RequireRole(["mentor"]))
):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    request = await db["mentorRequests"].find_one({"_id": ObjectId(request_id), "mentorId": user_id, "status": "pending"})
    if not request:
        raise HTTPException(status_code=404, detail="Pending mentor request not found")
    team = await db["teams"].find_one({"_id": ObjectId(request["teamId"])})
    if not team or team.get("mentorId"):
        raise HTTPException(status_code=409, detail="This team is no longer available for mentorship")
    now = datetime.utcnow()
    await db["mentorRequests"].update_one({"_id": request["_id"]}, {"$set": {"status": payload.decision, "responseMessage": payload.responseMessage or "", "respondedAt": now}})
    if payload.decision == "approved":
        await db["teams"].update_one({"_id": team["_id"]}, {"$set": {"mentorId": user_id, "mentorAssignedAt": now, "mentorRequestStatus": "approved"}})
        await db["mentorRequests"].update_many({"teamId": request["teamId"], "status": "pending", "_id": {"$ne": request["_id"]}}, {"$set": {"status": "closed", "respondedAt": now}})
    else:
        await db["teams"].update_one(
            {"_id": team["_id"]},
            {"$addToSet": {"mentorMatchExcludedIds": user_id}, "$set": {"mentorRequestStatus": "matching"}},
        )
        team = await db["teams"].find_one({"_id": team["_id"]})
        next_match = await _offer_ai_mentor_match(db, team)
        updated = await db["mentorRequests"].find_one({"_id": request["_id"]})
        updated["_id"] = str(updated["_id"])
        return {"data": updated, "nextMatchCreated": bool(next_match)}
    if request.get("requestedBy") and request["requestedBy"] != "ai-matcher":
        await _notify(db, request["requestedBy"], "mentor_request_decision", f"Mentor approved your request for {team.get('teamName', 'the team')}.", team.get("hackathonId"))
    updated = await db["mentorRequests"].find_one({"_id": request["_id"]})
    updated["_id"] = str(updated["_id"])
    return {"data": updated}


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
async def get_team_members(team_id: str, current_user: dict = Depends(with_auth)):
    """Get all members of a team with their registered names and saved roles."""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    is_member = await db["teamMembers"].find_one({"teamId": team_id, "userId": user_id})
    if not is_member and current_user.get("role") != "admin" and (not team or team.get("mentorId") != user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this team")
    members_collection = get_team_members_collection()
    members = await members_collection.find({"teamId": team_id}).to_list(100)

    user_ids = [member.get("userId") for member in members if ObjectId.is_valid(member.get("userId", ""))]
    users = await db["users"].find(
        {"_id": {"$in": [ObjectId(user_id) for user_id in user_ids]}},
        {"name": 1},
    ).to_list(100)
    registered_names = {str(user["_id"]): user.get("name") for user in users}

    for member in members:
        member["_id"] = str(member["_id"])
        member["name"] = registered_names.get(member.get("userId"))

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
