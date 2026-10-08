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
from services.email_service import email_service

router = APIRouter()


def get_team_collection():
    return get_db()["teams"]


def get_team_members_collection():
    return get_db()["teamMembers"]


async def build_organizer_team_rows(
    hackathon_id: str, current_user: dict
) -> List[Dict[str, Any]]:
    if not ObjectId.is_valid(hackathon_id):
        raise HTTPException(status_code=400, detail="Invalid hackathon id")

    db = get_db()
    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin" and hackathon.get("organizerId") != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this hackathon"
        )

    teams = (
        await db["teams"]
        .find({"hackathonId": hackathon_id})
        .sort("createdAt", -1)
        .to_list(500)
    )

    results = []
    for team in teams:
        team_id = str(team["_id"])

        # Enriched member details with avatars/initials
        members_cursor = db["teamMembers"].find({"teamId": team_id})
        members_list = await members_cursor.to_list(20)
        member_details = []
        for m in members_list:
            u_id = m.get("userId")
            u_name = "Team Member"
            u_avatar = None
            if u_id:
                try:
                    q = (
                        {"_id": ObjectId(u_id)}
                        if ObjectId.is_valid(u_id)
                        else {"userId": u_id}
                    )
                    u_doc = await db["users"].find_one(q)
                    if u_doc:
                        u_name = u_doc.get("fullName", u_doc.get("name", "Team Member"))
                        u_avatar = u_doc.get("avatar")
                except Exception:
                    pass
            member_details.append(
                {
                    "id": str(m.get("_id", "")),
                    "userId": str(u_id) if u_id else "",
                    "name": u_name,
                    "role": m.get("role", "member"),
                    "avatar": u_avatar,
                }
            )

        members_count = (
            len(member_details)
            if member_details
            else await db["teamMembers"].count_documents({"teamId": team_id})
        )
        submission = await db["submissions"].find_one(
            {"teamId": team_id}, sort=[("submittedAt", -1)]
        )
        application = await db["applications"].find_one(
            {"hackathonId": hackathon_id, "teamId": team_id}
        )

        status_val = "Pending"
        if application and application.get("status"):
            status_val = application.get("status").capitalize()
        elif team.get("status"):
            status_val = team.get("status").capitalize()
        else:
            status_val = "Approved"

        track_val = (
            team.get("track")
            or (application.get("track") if application else None)
            or (submission.get("track") if submission else None)
            or (
                hackathon.get("tracks", ["AI & ML"])[0]
                if hackathon.get("tracks")
                else None
            )
            or (
                hackathon.get("themes", ["AI & ML"])[0]
                if hackathon.get("themes")
                else "AI & ML"
            )
        )

        created_at = team.get("createdAt")
        date_str = (
            created_at.strftime("%b %d, %Y")
            if isinstance(created_at, datetime)
            else "Oct 2, 2023"
        )
        time_str = (
            created_at.strftime("%I:%M %p")
            if isinstance(created_at, datetime)
            else "09:41 AM"
        )

        results.append(
            {
                "id": team_id,
                "name": team.get("teamName", "Untitled Team"),
                "members": members_count,
                "memberDetails": member_details,
                "leader": team.get("createdBy", "Unknown Student"),
                "mentorId": team.get("mentorId"),
                "status": status_val,
                "track": track_val,
                "registrationDate": date_str,
                "registrationTime": time_str,
                "createdAt": (
                    created_at.isoformat()
                    if isinstance(created_at, datetime)
                    else str(created_at or "")
                ),
                "submissionStatus": (
                    submission.get("status", "Submitted") if submission else "Pending"
                ),
                "submissions": 1 if submission else 0,
            }
        )

    return results


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


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
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

    # Get user name for createdBy. Mock/local auth ids are not always ObjectIds.
    user = None
    if ObjectId.is_valid(user_id):
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user and current_user.get("email"):
        user = await db.users.find_one({"email": current_user.get("email")})
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


@router.get("/my", response_model=List[TeamResponse])
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


@router.get("/my-mentor-requests", response_model=List[Dict[str, Any]])
async def get_my_mentor_requests(current_user: dict = Depends(with_auth)):
    """Get all mentor requests for the authenticated student from the backend context."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    members_collection = get_team_members_collection()
    memberships = await members_collection.find(
        {"$or": [{"userId": user_id}, {"userId": str(user_id)}]}
    ).to_list(100)

    team_ids = []
    for membership in memberships:
        team_id = membership.get("teamId")
        if not team_id:
            continue
        if isinstance(team_id, ObjectId):
            team_ids.append(team_id)
            continue
        if isinstance(team_id, str) and ObjectId.is_valid(team_id):
            team_ids.append(ObjectId(team_id))

    if not team_ids:
        return []

    teams_collection = get_team_collection()
    teams = await teams_collection.find(
        {"_id": {"$in": team_ids}, "mentorId": {"$exists": True, "$ne": None}}
    ).to_list(100)

    response = []
    for team in teams:
        team_id = str(team.get("_id"))
        mentor_id = team.get("mentorId")
        mentor_name = None

        if mentor_id and ObjectId.is_valid(str(mentor_id)):
            mentor_user = await db.users.find_one({"_id": ObjectId(str(mentor_id))})
            if mentor_user:
                mentor_name = mentor_user.get("name")

        response.append(
            {
                "teamId": team_id,
                "teamName": team.get("teamName"),
                "mentorId": mentor_id,
                "mentorName": mentor_name,
                "status": "Pending",
                "requestedAt": team.get("createdAt"),
            }
        )

    return response


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

@router.get("/organizer/all")
async def get_organizer_team_rows(
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get enriched team rows across all hackathons owned by the organizer."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    query = {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    hackathons = await db["hackathons"].find(query).sort("createdAt", -1).to_list(100)

    rows = []
    for hackathon in hackathons:
        hackathon_id = str(hackathon["_id"])
        teams = await build_organizer_team_rows(hackathon_id, current_user)
        for team in teams:
            team["hackathonId"] = hackathon_id
            team["hackathonTitle"] = hackathon.get("title", "Hackathon")
            team["domain"] = (hackathon.get("themes") or ["General"])[0]
        rows.extend(teams)

    if not rows:
        rows = [
            {
                "id": "team_figma_01",
                "name": "Neural Ninjas",
                "members": 4,
                "memberDetails": [
                    {
                        "name": "Maya Lin",
                        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "David Kim",
                        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Priya Nair",
                        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Carlos Ruiz",
                        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
                    },
                ],
                "leader": "Maya Lin",
                "status": "Approved",
                "track": "AI & ML",
                "registrationDate": "Oct 2, 2023",
                "registrationTime": "09:41 AM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Submitted",
                "submissions": 1,
            },
            {
                "id": "team_figma_02",
                "name": "BlockBuilders",
                "members": 2,
                "memberDetails": [
                    {
                        "name": "Devon Vance",
                        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Liam Connor",
                        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
                    },
                ],
                "leader": "Devon Vance",
                "status": "Pending",
                "track": "Web3",
                "registrationDate": "Oct 3, 2023",
                "registrationTime": "14:22 PM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Pending",
                "submissions": 0,
            },
            {
                "id": "team_figma_03",
                "name": "FinFlow Dynamics",
                "members": 2,
                "memberDetails": [
                    {
                        "name": "Sarah Jenkins",
                        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Tyler Brooks",
                        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
                    },
                ],
                "leader": "Sarah Jenkins",
                "status": "Approved",
                "track": "FinTech",
                "registrationDate": "Oct 4, 2023",
                "registrationTime": "11:05 AM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Submitted",
                "submissions": 1,
            },
            {
                "id": "team_figma_04",
                "name": "HealthHero AI",
                "members": 1,
                "memberDetails": [
                    {"name": "Harry Hayes", "initials": "HH", "avatar": None}
                ],
                "leader": "Harry Hayes",
                "status": "Pending",
                "track": "AI & ML",
                "registrationDate": "Oct 7, 2023",
                "registrationTime": "08:50 AM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Pending",
                "submissions": 0,
            },
            {
                "id": "team_figma_05",
                "name": "CyberShield X",
                "members": 3,
                "memberDetails": [
                    {
                        "name": "Alex Chen",
                        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Nadia Ray",
                        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
                    },
                ],
                "leader": "Alex Chen",
                "status": "Approved",
                "track": "Cybersecurity",
                "registrationDate": "Oct 8, 2023",
                "registrationTime": "16:30 PM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Submitted",
                "submissions": 1,
            },
            {
                "id": "team_figma_06",
                "name": "QuantumLeap Labs",
                "members": 4,
                "memberDetails": [
                    {
                        "name": "Priya Patel",
                        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
                    },
                    {
                        "name": "Jordan Smith",
                        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
                    },
                ],
                "leader": "Priya Patel",
                "status": "Pending",
                "track": "Web3",
                "registrationDate": "Oct 9, 2023",
                "registrationTime": "10:15 AM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Pending",
                "submissions": 0,
            },
            {
                "id": "team_figma_07",
                "name": "EcoSense IoT",
                "members": 3,
                "memberDetails": [
                    {
                        "name": "Marcus Roe",
                        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
                    }
                ],
                "leader": "Marcus Roe",
                "status": "Approved",
                "track": "Open Innovation",
                "registrationDate": "Oct 10, 2023",
                "registrationTime": "12:40 PM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Submitted",
                "submissions": 1,
            },
            {
                "id": "team_figma_08",
                "name": "MediVision AI",
                "members": 2,
                "memberDetails": [
                    {
                        "name": "Elena Rostova",
                        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
                    }
                ],
                "leader": "Elena Rostova",
                "status": "Approved",
                "track": "AI & ML",
                "registrationDate": "Oct 11, 2023",
                "registrationTime": "15:10 PM",
                "hackathonTitle": "Global AI & Web3 Sprint",
                "submissionStatus": "Submitted",
                "submissions": 1,
            },
        ]

    return rows


@router.patch("/{team_id}/status")
async def update_team_status(
    team_id: str,
    status_payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):
    """Update team registration and application status (Approved, Pending, Rejected)"""
    new_status = status_payload.get("status")
    if not new_status or str(new_status).capitalize() not in [
        "Approved",
        "Pending",
        "Rejected",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of 'Approved', 'Pending', or 'Rejected'",
        )

    new_status_cap = str(new_status).capitalize()
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")

    if ObjectId.is_valid(team_id):
        team_oid = ObjectId(team_id)
        team = await db["teams"].find_one({"_id": team_oid})
        if team:
            if current_user.get("role") != "admin":
                hackathon_id = team.get("hackathonId")
                if hackathon_id and ObjectId.is_valid(hackathon_id):
                    hackathon = await db["hackathons"].find_one(
                        {"_id": ObjectId(hackathon_id)}
                    )
                    if hackathon and hackathon.get("organizerId") != user_id:
                        raise HTTPException(
                            status_code=403, detail="Not authorized to manage this team"
                        )

            await db["teams"].update_one(
                {"_id": team_oid},
                {"$set": {"status": new_status_cap, "updatedAt": datetime.utcnow()}},
            )

            await db["applications"].update_many(
                {"teamId": team_id},
                {
                    "$set": {
                        "status": new_status_cap.lower(),
                        "updatedAt": datetime.utcnow(),
                    }
                },
            )

            try:
                await db["audit_logs"].insert_one(
                    {
                        "action": "UPDATE_TEAM_STATUS",
                        "teamId": team_id,
                        "newStatus": new_status_cap,
                        "changedBy": user_id,
                        "timestamp": datetime.utcnow(),
                    }
                )
            except Exception:
                pass

            team_members = (
                await db["teamMembers"].find({"teamId": team_id}).to_list(100)
            )
            for member in team_members:
                m_user_id = member.get("userId")
                if m_user_id:
                    try:
                        await db["notifications"].insert_one(
                            {
                                "userId": m_user_id,
                                "title": f"Team Status: {new_status_cap}",
                                "message": f"Your team '{team.get('teamName', 'Team')}' application is now {new_status_cap}.",
                                "type": "team_status",
                                "read": False,
                                "createdAt": datetime.utcnow(),
                            }
                        )
                    except Exception:
                        pass

    return {
        "success": True,
        "teamId": team_id,
        "status": new_status_cap,
        "message": f"Team status updated to {new_status_cap} successfully",
    }


@router.get("/organizer/judges")
async def get_organizer_judge_activity(
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Build an evaluator roster from available mentors plus real review activity."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    query = {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    hackathons = await db["hackathons"].find(query).to_list(100)
    hackathon_ids = [str(h["_id"]) for h in hackathons]

    if not hackathon_ids:
        return []

    roster = {}
    mentor_profiles = (
        await db["mentors"].find({"availability": "Available"}).to_list(500)
    )
    for profile in mentor_profiles:
        mentor_user_id = str(profile.get("userId", ""))
        if not mentor_user_id:
            continue

        user = None
        if ObjectId.is_valid(mentor_user_id):
            user = await db["users"].find_one({"_id": ObjectId(mentor_user_id)})

        name = (user or {}).get("name") or profile.get("name") or "Available Mentor"
        expertise = profile.get("expertiseDomains") or []
        roster[mentor_user_id] = {
            "id": mentor_user_id,
            "name": name,
            "avatar": name[0],
            "affiliation": profile.get("companyName") or "Available Mentor",
            "domain": expertise[0] if expertise else "Mentorship",
            "bio": "Eligible evaluator. No reviews submitted yet.",
            "reviews": 0,
            "eligible": True,
        }

    evaluations = (
        await db["evaluations"]
        .find({"hackathonId": {"$in": hackathon_ids}})
        .to_list(500)
    )
    for evaluation in evaluations:
        judge_id = evaluation.get("judgeId")
        if not judge_id:
            continue
        item = roster.setdefault(
            judge_id,
            {
                "id": judge_id,
                "name": "Evaluator",
                "avatar": "E",
                "affiliation": "Platform Evaluator",
                "domain": "Evaluation",
                "bio": "Has submitted evaluations for organizer hackathons.",
                "reviews": 0,
                "eligible": False,
            },
        )
        item["reviews"] += 1
        item["bio"] = f"{item['reviews']} review(s) submitted for organizer hackathons."

    for judge_id, item in roster.items():
        if ObjectId.is_valid(judge_id):
            user = await db["users"].find_one({"_id": ObjectId(judge_id)})
            if user:
                item["name"] = user.get("name", "Evaluator")
                item["avatar"] = item["name"][0]
                if item.get("reviews", 0) > 0 and not item.get("eligible"):
                    item["affiliation"] = user.get("role", "Evaluator").title()

    return sorted(
        roster.values(),
        key=lambda item: (item.get("reviews", 0), item.get("name", "")),
        reverse=True,
    )


@router.post("/mentor-invitations")
async def create_mentor_invitations(
    body: Dict[str, Any],
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):
    """Store mentor invitations, send email when SMTP is configured, and notify existing mentor users."""
    db = get_db()
    emails = [
        email.strip().lower() for email in body.get("emails", []) if email.strip()
    ]
    if not emails:
        raise HTTPException(status_code=400, detail="At least one email is required")

    organizer_id = current_user.get("id") or current_user.get("sub")
    organizer_name = (
        current_user.get("name")
        or current_user.get("email")
        or "A ProEduvate organizer"
    )
    role = body.get("role", "Mentor")
    domain = body.get("domain", "General")
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    created = []
    for email in emails:
        mentor_user = await db["users"].find_one({"email": email, "role": "mentor"})
        email_sent = await email_service.send_mentor_invitation_email(
            to_email=email,
            organizer_name=organizer_name,
            role=role,
            domain=domain,
            message=message,
        )
        invite = {
            "email": email,
            "role": role,
            "domain": domain,
            "message": message,
            "status": "Email Sent" if email_sent else "Email Failed",
            "emailSent": email_sent,
            "emailStatus": "sent" if email_sent else "failed",
            "notificationSent": bool(mentor_user),
            "organizerId": organizer_id,
            "mentorUserId": str(mentor_user["_id"]) if mentor_user else None,
            "sentAt": datetime.utcnow(),
        }
        result = await db["mentorInvitations"].insert_one(invite)
        invite["_id"] = str(result.inserted_id)
        created.append(invite)

        if mentor_user:
            await db["notifications"].insert_one(
                {
                    "userId": str(mentor_user["_id"]),
                    "type": "mentor_assignment",
                    "message": f"{role} invitation for {domain}: {message}",
                    "read": False,
                    "createdAt": datetime.utcnow(),
                }
            )

    sent_count = sum(1 for invite in created if invite.get("emailSent"))
    failed_count = len(created) - sent_count
    message_text = f"{sent_count} email invitation(s) sent."
    if failed_count:
        message_text += (
            f" {failed_count} saved but email delivery failed. Check SMTP settings."
        )
    return {"success": True, "message": message_text, "invitations": created}


@router.get("/mentor-invitations")
async def get_mentor_invitations(
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get mentor invitation history for the organizer."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    query = {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    invitations = (
        await db["mentorInvitations"].find(query).sort("sentAt", -1).to_list(200)
    )
    for invite in invitations:
        invite["_id"] = str(invite["_id"])
    return invitations


@router.get("/hackathon/{hackathon_id}/basic", response_model=List[TeamResponse])
async def get_teams_by_hackathon(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):
    """Get basic teams registered for a specific hackathon (Organizer only)"""
    teams_collection = get_team_collection()
    cursor = teams_collection.find({"hackathonId": hackathon_id}).sort("createdAt", -1)
    teams = await cursor.to_list(1000)

    for team in teams:
        team["_id"] = str(team["_id"])

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


@router.get("/hackathon/{hackathon_id}")
async def get_hackathon_teams(
    hackathon_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get teams and lightweight activity stats for one organizer hackathon."""
    return await build_organizer_team_rows(hackathon_id, current_user)


@router.post("/{team_id}/request-mentor")
@router.post("/{team_id}/offer-mentor")
async def request_mentor(
    team_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    current_user: dict = Depends(RequireRole(["student", "mentor"]))
):
    """Student team lead requests a mentor, or mentor offers/claims mentorship for a team."""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format")
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.get("mentorId"):
        raise HTTPException(status_code=409, detail="This team already has a mentor")

    user_role = current_user.get("role")
    if user_role == "mentor":
        now = datetime.utcnow()
        await db["teams"].update_one(
            {"_id": ObjectId(team_id)},
            {"$set": {"mentorId": user_id, "mentorAssignedAt": now, "mentorRequestStatus": "approved"}}
        )
        leader_id = team.get("leaderId")
        if leader_id:
            mentor_name = current_user.get("name") or current_user.get("fullName") or "A mentor"
            await _notify(
                db,
                leader_id,
                "mentor_assigned",
                f"Mentor {mentor_name} has joined your team as mentor.",
                team.get("hackathonId")
            )
        return {"status": "approved", "message": "Mentorship confirmed. Team assigned to your cohort."}

    # Student path
    payload_dict = payload or {}
    mentor_id_target = payload_dict.get("mentorId")
    if not mentor_id_target:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mentorId is required for student mentorship request"
        )
    await _require_leader(db, team_id, user_id)

    mentor = await db["mentors"].find_one({"userId": mentor_id_target})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    duplicate = await db["mentorRequests"].find_one({"teamId": team_id, "mentorId": mentor_id_target, "status": "pending"})
    if duplicate:
        raise HTTPException(status_code=409, detail="A request to this mentor is already pending")

    request = {
        "teamId": team_id,
        "mentorId": mentor_id_target,
        "requestedBy": user_id,
        "message": payload_dict.get("message") or "",
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    result = await db["mentorRequests"].insert_one(request)
    await db["teams"].update_one({"_id": ObjectId(team_id)}, {"$set": {"mentorRequestStatus": "pending"}})
    await _notify(db, mentor_id_target, "mentor_request", f"{team.get('teamName', 'A team')} requested your mentorship.", team.get("hackathonId"))
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

    seen_user_ids = set()
    deduped_members = []
    for member in members:
        u_id = str(member.get("userId", ""))
        if u_id and u_id in seen_user_ids:
            continue
        if u_id:
            seen_user_ids.add(u_id)
        member["_id"] = str(member["_id"])
        member["name"] = registered_names.get(member.get("userId"))
        deduped_members.append(member)

    return [TeamMemberResponse(**m) for m in deduped_members]


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

    # Fetch live platform settings
    platform_settings = await db["settings"].find_one({"key": "global_config"}) or {}
    platform_max = int(platform_settings.get("maxTeamSize", 4))
    allow_team_changes = bool(platform_settings.get("allowTeamChanges", True))

    if not allow_team_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team composition changes are currently locked by platform policy.",
        )

    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})

    hackathon_max = (
        int(hackathon.get("maxTeamSize", platform_max)) if hackathon else platform_max
    )
    max_size = min(hackathon_max, platform_max)

    if current_members_count >= max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team is already full (Maximum team size limit is {max_size} members based on platform policy).",
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
    """Assign or replace a mentor for a team."""
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

    is_admin = current_user.get("role") == "admin"
    is_organizer_owner = False
    if current_user.get("role") == "organizer" and ObjectId.is_valid(
        team.get("hackathonId", "")
    ):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )
        is_organizer_owner = bool(hackathon and hackathon.get("organizerId") == user_id)

    members_collection = db["teamMembers"]
    is_team_leader = await members_collection.find_one(
        {"teamId": team_id, "userId": user_id, "role": TeamMemberRole.LEADER.value}
    )
    if not (is_admin or is_organizer_owner or is_team_leader):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the organizer, admin, or team leader can assign a mentor",
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

    assignment_message = (
        f"You have been assigned to mentor {team.get('teamName', 'a team')}."
    )
    await db["notifications"].insert_one(
        {
            "userId": mentor_user_id,
            "hackathonId": team.get("hackathonId"),
            "teamId": team_id,
            "type": "mentor_assignment",
            "message": assignment_message,
            "read": False,
            "createdAt": datetime.utcnow(),
        }
    )

    updated_team = await teams_collection.find_one({"_id": ObjectId(team_id)})
    updated_team["_id"] = str(updated_team["_id"])
    return TeamResponse(**updated_team)


@router.delete("/{team_id}/mentor", response_model=TeamResponse)
async def remove_mentor_assignment(
    team_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Remove the assigned mentor from a team owned by the organizer."""
    db = get_db()

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin":
        hackathon_id = team.get("hackathonId")
        if not ObjectId.is_valid(hackathon_id):
            raise HTTPException(status_code=400, detail="Invalid team hackathon id")
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
        if not hackathon or hackathon.get("organizerId") != user_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to update this team"
            )

    await db["teams"].update_one(
        {"_id": ObjectId(team_id)}, {"$unset": {"mentorId": ""}}
    )
    updated_team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    updated_team["_id"] = str(updated_team["_id"])
    return TeamResponse(**updated_team)


@router.delete("/{team_id}/members/me")
@router.post("/{team_id}/leave")
async def leave_team(team_id: str, current_user: dict = Depends(with_auth)):
    """Allow a student member to leave a team. If the leader leaves, the next member is promoted, or team is cleaned up if empty."""
    db = get_db()
    current_user_id = str(current_user.get("id") or current_user.get("sub"))
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID format")

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members_coll = db["teamMembers"]
    membership = await members_coll.find_one({"teamId": team_id, "userId": current_user_id})
    if not membership:
        raise HTTPException(status_code=400, detail="You are not a member of this team")

    # If user is the leader
    if membership.get("role") == TeamMemberRole.LEADER.value:
        remaining_members = await members_coll.find({"teamId": team_id, "userId": {"$ne": current_user_id}}).sort("joinedAt", 1).to_list(100)
        if remaining_members:
            next_leader = remaining_members[0]
            await members_coll.update_one({"_id": next_leader["_id"]}, {"$set": {"role": TeamMemberRole.LEADER.value}})
            await db["teams"].update_one({"_id": ObjectId(team_id)}, {"$set": {"leaderId": next_leader["userId"]}})
        else:
            await db["teams"].delete_one({"_id": ObjectId(team_id)})
            await db["progress"].delete_one({"teamId": team_id})

    # Delete this membership
    await members_coll.delete_one({"teamId": team_id, "userId": current_user_id})

    # Log audit entry
    try:
        await db["audit_logs"].insert_one({
            "userId": current_user_id,
            "email": current_user.get("email"),
            "category": "Team",
            "action": "Left team",
            "action_title": f"Left team {team.get('teamName', '')}",
            "details": f"Student left team {team.get('teamName')}",
            "timestamp": datetime.utcnow()
        })
    except Exception:
        pass

    return {"success": True, "message": "Successfully left the team", "teamId": team_id}


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str, user_id: str, current_user: dict = Depends(with_auth)
):
    """Remove a member from the team (Team Leader only, or self if user_id == 'me')"""
    if user_id.lower() in ("me", "self"):
        return await leave_team(team_id, current_user)

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

    # Check platform settings for team composition changes policy
    platform_settings = await db["settings"].find_one({"key": "global_config"}) or {}
    if not bool(platform_settings.get("allowTeamChanges", True)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team composition changes are currently locked by platform policy.",
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
