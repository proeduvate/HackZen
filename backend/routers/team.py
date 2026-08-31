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
from services.email_service import email_service

router = APIRouter()


def get_team_collection():
    return get_db()["teams"]


def get_team_members_collection():
    return get_db()["teamMembers"]


async def build_organizer_team_rows(hackathon_id: str, current_user: dict) -> List[Dict[str, Any]]:
    if not ObjectId.is_valid(hackathon_id):
        raise HTTPException(status_code=400, detail="Invalid hackathon id")

    db = get_db()
    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin" and hackathon.get("organizerId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this hackathon")

    teams = (
        await db["teams"]
        .find({"hackathonId": hackathon_id})
        .sort("createdAt", -1)
        .to_list(500)
    )

    results = []
    for team in teams:
        team_id = str(team["_id"])
        members_count = await db["teamMembers"].count_documents({"teamId": team_id})
        submission = await db["submissions"].find_one(
            {"teamId": team_id}, sort=[("submittedAt", -1)]
        )
        application = await db["applications"].find_one(
            {"hackathonId": hackathon_id, "teamId": team_id}
        )

        results.append(
            {
                "id": team_id,
                "name": team.get("teamName", "Untitled Team"),
                "members": members_count,
                "leader": team.get("createdBy", "Unknown Student"),
                "mentorId": team.get("mentorId"),
                "status": (
                    application.get("status", "approved").title()
                    if application
                    else "Approved"
                ),
                "registrationDate": (
                    team["createdAt"].strftime("%b %d, %Y")
                    if team.get("createdAt")
                    else "N/A"
                ),
                "submissionStatus": submission.get("status", "Submitted")
                if submission
                else "Pending",
                "submissions": 1 if submission else 0,
            }
        )

    return results


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
        "lastUpdated": datetime.utcnow(),
    }
    await progress_collection.insert_one(progress_data)

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

    return rows


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
    mentor_profiles = await db["mentors"].find({"availability": "Available"}).to_list(500)
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

    evaluations = await db["evaluations"].find({"hackathonId": {"$in": hackathon_ids}}).to_list(500)
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
    body: Dict[str, Any], current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Store mentor invitations, send email when SMTP is configured, and notify existing mentor users."""
    db = get_db()
    emails = [email.strip().lower() for email in body.get("emails", []) if email.strip()]
    if not emails:
        raise HTTPException(status_code=400, detail="At least one email is required")

    organizer_id = current_user.get("id") or current_user.get("sub")
    organizer_name = current_user.get("name") or current_user.get("email") or "A ProEduvate organizer"
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
        message_text += f" {failed_count} saved but email delivery failed. Check SMTP settings."
    return {"success": True, "message": message_text, "invitations": created}


@router.get("/mentor-invitations")
async def get_mentor_invitations(
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get mentor invitation history for the organizer."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    query = {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    invitations = await db["mentorInvitations"].find(query).sort("sentAt", -1).to_list(200)
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


@router.get("/hackathon/{hackathon_id}")
async def get_hackathon_teams(
    hackathon_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get teams and lightweight activity stats for one organizer hackathon."""
    return await build_organizer_team_rows(hackathon_id, current_user)


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
    if current_user.get("role") == "organizer" and ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
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

    assignment_message = f"You have been assigned to mentor {team.get('teamName', 'a team')}."
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    user_id = current_user.get("id") or current_user.get("sub")
    if current_user.get("role") != "admin":
        hackathon_id = team.get("hackathonId")
        if not ObjectId.is_valid(hackathon_id):
            raise HTTPException(status_code=400, detail="Invalid team hackathon id")
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
        if not hackathon or hackathon.get("organizerId") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this team")

    await db["teams"].update_one({"_id": ObjectId(team_id)}, {"$unset": {"mentorId": ""}})
    updated_team = await db["teams"].find_one({"_id": ObjectId(team_id)})
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
