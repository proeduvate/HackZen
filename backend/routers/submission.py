from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from schemas.submission import SubmissionCreate, SubmissionResponse
from models.submission import SubmissionInDB

router = APIRouter()

ALLOWED_SUBMISSION_STATUSES = {
    "Pending Review",
    "Reviewed",
    "Shortlisted",
    "Rejected",
    "Evaluated",
}


def get_submission_collection():
    return get_db()["submissions"]


async def build_submission_row(submission: Dict[str, Any], db) -> Dict[str, Any]:
    team = None
    hackathon = None
    team_id = submission.get("teamId")

    if ObjectId.is_valid(team_id):
        team = await db["teams"].find_one({"_id": ObjectId(team_id)})

    if team and ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})

    evaluation_count = await db["evaluations"].count_documents(
        {"submissionId": str(submission["_id"])}
    )

    status_value = submission.get("status")
    if not status_value:
        status_value = "Evaluated" if evaluation_count else "Pending Review"
    if status_value == "Pending":
        status_value = "Pending Review"

    submitted_at = submission.get("submittedAt")

    return {
        "id": str(submission["_id"]),
        "teamId": team_id,
        "team": team.get("teamName", "Unknown Team") if team else "Unknown Team",
        "logo": (team.get("teamName", "T")[0] if team else "T"),
        "teamCode": team.get("teamCode", "N/A") if team else "N/A",
        "hackathonId": str(hackathon["_id"]) if hackathon else None,
        "hackathon": hackathon.get("title", "Unknown Hackathon") if hackathon else "Unknown Hackathon",
        "title": submission.get("project", f"Project Submission v{submission.get('version', 1)}"),
        "description": submission.get("desc", ""),
        "track": submission.get("category", "General"),
        "status": status_value,
        "time": submitted_at.strftime("%b %d, %Y") if submitted_at else "N/A",
        "submittedAt": submitted_at.isoformat() if submitted_at else None,
        "fileUrl": submission.get("fileUrl"),
        "version": submission.get("version", 1),
        "evaluationCount": evaluation_count,
        "score": submission.get("totalScore"),
    }


async def can_manage_submission(submission: Dict[str, Any], current_user: Dict[str, Any], db) -> bool:
    if current_user.get("role") == "admin":
        return True

    if current_user.get("role") != "organizer":
        return False

    team_id = submission.get("teamId")
    if not ObjectId.is_valid(team_id):
        return False

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team or not ObjectId.is_valid(team.get("hackathonId", "")):
        return False

    hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
    user_id = current_user.get("id") or current_user.get("sub")
    return bool(hackathon and hackathon.get("organizerId") == user_id)


@router.post(
    "/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED
)
async def create_submission(
    sub_data: SubmissionCreate, current_user: dict = Depends(with_auth)
):
    """Submit project for a hackathon stage"""
    # Authorization: User must be in the team
    user_id = current_user.get("id") or current_user.get("sub")
    members_collection = get_db()["teamMembers"]
    is_member = await members_collection.find_one(
        {"teamId": sub_data.teamId, "userId": user_id}
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can submit projects",
        )

    collection = get_submission_collection()

    # Get current version for this team/stage
    current_version = await collection.count_documents(
        {"teamId": sub_data.teamId, "stageId": sub_data.stageId}
    )

    sub_dict = sub_data.model_dump(by_alias=True)
    sub_dict["version"] = current_version + 1
    sub_dict["submittedAt"] = datetime.utcnow()

    result = await collection.insert_one(sub_dict)
    sub_dict["_id"] = str(result.inserted_id)

    return SubmissionResponse(**sub_dict)


@router.get("/", response_model=List[SubmissionResponse])
async def get_all_submissions(current_user: dict = Depends(with_auth)):
    """Get all submissions (Organizer/Admin only)"""
    if current_user.get("role") not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    collection = get_submission_collection()
    cursor = collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    for sub in subs:
        sub["_id"] = str(sub["_id"])

    return [SubmissionResponse(**sub) for sub in subs]


@router.get("/organizer/all")
async def get_organizer_submissions(current_user: dict = Depends(with_auth)):
    """Get enriched submissions only for hackathons owned by the current organizer."""
    if current_user.get("role") not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    hackathon_query = {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    hackathons = await db["hackathons"].find(hackathon_query).to_list(500)
    hackathon_ids = [str(hackathon["_id"]) for hackathon in hackathons]

    if not hackathon_ids:
        return []

    teams = await db["teams"].find({"hackathonId": {"$in": hackathon_ids}}).to_list(1000)
    team_ids = [str(team["_id"]) for team in teams]

    if not team_ids:
        return []

    submissions = (
        await db["submissions"]
        .find({"teamId": {"$in": team_ids}})
        .sort("submittedAt", -1)
        .to_list(1000)
    )

    return [await build_submission_row(submission, db) for submission in submissions]


@router.get("/admin/all")
async def get_admin_submissions(current_user: dict = Depends(with_auth)):
    """Fetch all submissions with resolved team and hackathon titles for admin view"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    submissions_collection = db["submissions"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]

    cursor = submissions_collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(100)

    # Seed mock if empty
    if not subs:
        mock_subs = [
            {
                "teamId": "team_1",
                "stageId": "stage_1",
                "fileUrl": "#",
                "project": "AI Health Assistant",
                "desc": "Predictive analytics for personal wellness.",
                "category": "Healthcare",
                "status": "Pending",
                "version": 1,
                "submittedAt": datetime.utcnow(),
            }
        ]
        await submissions_collection.insert_many(mock_subs)
        subs = await submissions_collection.find().to_list(100)

    result = []
    for sub in subs:
        team = (
            await teams_collection.find_one({"_id": ObjectId(sub["teamId"])})
            if ObjectId.is_valid(sub["teamId"])
            else None
        )
        hackathon = None
        if team:
            hackathon = await hackathons_collection.find_one(
                {"_id": ObjectId(team["hackathonId"])}
            )

        sub_id = str(sub["_id"])
        formatted_sub = {
            "id": sub_id,
            "project": sub.get("project", "Untitled Project"),
            "desc": sub.get("desc", "No description"),
            "team": {
                "name": team["teamName"] if team else "CyberKnights",
                "avatar": f"https://ui-avatars.com/api/?name={team['teamName'].replace(' ', '+') if team else 'Team'}&background=random",
            },
            "hackathon": hackathon["title"] if hackathon else "Global Hackathon",
            "docs": [{"type": "Submission File", "icon": "📄"}],
            "date": sub["submittedAt"].strftime("%b %d, %Y"),
            "timestamp": int(sub["submittedAt"].timestamp() * 1000),
            "status": sub.get("status", "Pending"),
            "category": sub.get("category", "Healthcare"),
        }
        result.append(formatted_sub)

    return result


@router.get("/team/{team_id}")
async def get_team_submissions(
    team_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get all submissions for a specific team (members, owning organizer, or admin)."""
    db = get_db()
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team id")

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user_id = current_user.get("id") or current_user.get("sub")
    is_authorized = current_user.get("role") == "admin"

    if not is_authorized and ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
        is_authorized = bool(hackathon and hackathon.get("organizerId") == user_id)

    if not is_authorized:
        member = await db["teamMembers"].find_one({"teamId": team_id, "userId": user_id})
        is_authorized = bool(member) or team.get("leaderId") == user_id

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view these submissions")

    submissions = (
        await db["submissions"]
        .find({"teamId": team_id})
        .sort("submittedAt", -1)
        .to_list(200)
    )

    return [await build_submission_row(submission, db) for submission in submissions]


@router.put("/{submission_id}/status")
async def update_sub_status(
    submission_id: str,
    status_update: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update submission status for admin or owning organizer."""
    if current_user.get("role") not in ["admin", "organizer"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    if new_status not in ALLOWED_SUBMISSION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid submission status")

    collection = get_submission_collection()
    if not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission id")

    submission = await collection.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if not await can_manage_submission(submission, current_user, get_db()):
        raise HTTPException(status_code=403, detail="Not authorized to update this submission")

    result = await collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": new_status, "reviewedAt": datetime.utcnow()}},
    )

    if result.modified_count == 0:
        return {"success": True, "message": "Submission status unchanged"}

    return {"success": True, "message": "Submission status updated"}
