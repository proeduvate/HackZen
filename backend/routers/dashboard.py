from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from core.dependencies import RequireRole, with_auth
from database import get_db

router = APIRouter()


def _object_ids(values: List[Optional[str]]) -> List[ObjectId]:
    """Return only valid Mongo ids, without failing a student's dashboard."""
    return [ObjectId(value) for value in values if value and ObjectId.is_valid(value)]


def _serialize_date(value: Any) -> Optional[str]:
    return value.isoformat() if isinstance(value, datetime) else value


def _serialize_hackathon(hackathon: Dict[str, Any]) -> Dict[str, Any]:
    """Expose the existing canonical hackathon fields used by the student UI."""
    return {
        "id": str(hackathon["_id"]),
        "title": hackathon.get("title", "Untitled hackathon"),
        "description": hackathon.get("description", ""),
        "status": hackathon.get("status", ""),
        "hackathonStart": _serialize_date(hackathon.get("hackathonStart")),
        "hackathonEnd": _serialize_date(hackathon.get("hackathonEnd")),
        "registrationStart": _serialize_date(hackathon.get("registrationStart")),
        "registrationEnd": _serialize_date(hackathon.get("registrationEnd")),
        "posterUrl": hackathon.get("posterUrl"),
        "location": hackathon.get("location"),
        "themes": hackathon.get("themes", []),
        "prizes": hackathon.get("prizes", []),
    }


async def _team_progress(db, team_id: str) -> Dict[str, Any]:
    """Return a percentage only when stored progress records support one."""
    progress = await db["progress"].find_one({"teamId": team_id})
    if not progress:
        return {"status": "not-started", "percentage": None, "currentStageId": None}

    progress_status = progress.get("status", "not-started")
    if progress_status == "completed":
        percentage = 100
    else:
        milestones = await db["milestoneProgress"].find(
            {"progressId": str(progress["_id"])}
        ).to_list(1000)
        percentage = (
            round(
                (sum(1 for milestone in milestones if milestone.get("completed")) / len(milestones))
                * 100
            )
            if milestones
            else None
        )

    return {
        "status": progress_status,
        "percentage": percentage,
        "currentStageId": progress.get("currentStageId"),
    }


@router.get("/my-hackathons")
async def get_my_hackathons_dashboard(current_user: dict = Depends(with_auth)):
    """Get the authenticated student's dashboard using only persisted platform data."""
    db = get_db()
    user_id = current_user["sub"]
    now = datetime.utcnow()

    applications = await db["applications"].find({"userId": user_id}).sort(
        "appliedAt", -1
    ).to_list(100)
    memberships = await db["teamMembers"].find({"userId": user_id}).to_list(100)
    team_ids = _object_ids([membership.get("teamId") for membership in memberships])
    teams = (
        await db["teams"].find({"_id": {"$in": team_ids}}).to_list(100)
        if team_ids
        else []
    )

    registered_ids = {application.get("hackathonId") for application in applications}
    team_hackathon_ids = {team.get("hackathonId") for team in teams}
    referenced_hackathon_ids = _object_ids(list(registered_ids | team_hackathon_ids))
    referenced_hackathons = (
        await db["hackathons"].find({"_id": {"$in": referenced_hackathon_ids}}).to_list(200)
        if referenced_hackathon_ids
        else []
    )
    hackathons_by_id = {
        str(hackathon["_id"]): hackathon for hackathon in referenced_hackathons
    }
    memberships_by_team = {
        membership.get("teamId"): membership for membership in memberships
    }
    progress_by_team = {
        str(team["_id"]): await _team_progress(db, str(team["_id"])) for team in teams
    }

    registered_hackathons = []
    for application in applications:
        hackathon_id = application.get("hackathonId")
        hackathon = hackathons_by_id.get(hackathon_id)
        if not hackathon:
            continue

        team = next(
            (item for item in teams if item.get("hackathonId") == hackathon_id), None
        )
        team_id = str(team["_id"]) if team else None
        registered_hackathons.append(
            {
                **_serialize_hackathon(hackathon),
                "applicationStatus": application.get("status", "pending"),
                "appliedAt": _serialize_date(application.get("appliedAt")),
                "team": (
                    {
                        "id": team_id,
                        "name": team.get("teamName"),
                        "role": memberships_by_team.get(team_id, {}).get("role", "member"),
                        "progress": progress_by_team.get(team_id),
                    }
                    if team
                    else None
                ),
            }
        )

    active_teams = [
        team
        for team in teams
        if (hackathons_by_id.get(team.get("hackathonId"), {}).get("hackathonEnd") or now) >= now
        and str(hackathons_by_id.get(team.get("hackathonId"), {}).get("status", "")).lower()
        not in {"completed", "results announced"}
    ]

    team_id_strings = [str(team["_id"]) for team in teams]
    submissions_count = (
        await db["submissions"].count_documents({"teamId": {"$in": team_id_strings}})
        if team_id_strings
        else 0
    )
    certificates_count = await db["certificates"].count_documents({"userId": user_id})

    # Upcoming means not started and not already registered by this student.
    upcoming_docs = await db["hackathons"].find(
        {"hackathonStart": {"$gte": now}, "isPublic": {"$ne": False}}
    ).sort("hackathonStart", 1).to_list(100)
    upcoming_hackathons = [
        _serialize_hackathon(hackathon)
        for hackathon in upcoming_docs
        if str(hackathon["_id"]) not in registered_ids
        and str(hackathon.get("status", "")).lower()
        not in {"draft", "completed", "results announced"}
    ]

    return {
        "student": {"name": current_user.get("name", "Student")},
        "metrics": {
            "registeredHackathons": len(applications),
            "activeTeams": len(active_teams),
            "submissions": submissions_count,
            "certificates": certificates_count,
        },
        "registeredHackathons": registered_hackathons,
        "upcomingHackathons": upcoming_hackathons,
    }
@router.get("/organizer-stats")
async def get_organizer_stats(
    current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get organizer dashboard statistics"""

    hackathons_collection = get_db()["hackathons"]
    teams_collection = get_db()["teams"]
    apps_collection = get_db()["applications"]

    # Get organizer's hackathons
    my_hackathons = await hackathons_collection.find(
        {"organizerId": current_user["sub"]}
    ).to_list(100)
    hackathon_ids = [str(h["_id"]) for h in my_hackathons]

    stats = {
        "totalHackathons": len(my_hackathons),
        "totalParticipants": await apps_collection.count_documents(
            {"hackathonId": {"$in": hackathon_ids}}
        ),
        "totalTeams": await teams_collection.count_documents(
            {"hackathonId": {"$in": hackathon_ids}}
        ),
        "hackathonBreakdown": [],
    }

    for h in my_hackathons:
        h_id = str(h["_id"])
        stats["hackathonBreakdown"].append(
            {
                "id": h_id,
                "title": h["title"],
                "status": h["status"],
                "teamCount": await teams_collection.count_documents(
                    {"hackathonId": h_id}
                ),
                "participantCount": await apps_collection.count_documents(
                    {"hackathonId": h_id}
                ),
            }
        )

    return stats


@router.get("/settings")
async def get_platform_settings(current_user: dict = Depends(RequireRole(["admin"]))):
    settings_collection = get_db()["settings"]
    settings = await settings_collection.find_one({"type": "platform"})
    if not settings:
        settings = {
            "platformName": "ProEduvate",
            "supportEmail": "support@proeduvate.com",
            "publicRegistrations": True,
            "maintenanceMode": False,
        }
        await settings_collection.insert_one({"type": "platform", **settings})

    settings.pop("_id", None)
    settings.pop("type", None)
    return settings


@router.put("/settings")
async def update_platform_settings(
    new_settings: dict, current_user: dict = Depends(RequireRole(["admin"]))
):
    settings_collection = get_db()["settings"]
    await settings_collection.update_one(
        {"type": "platform"}, {"$set": new_settings}, upsert=True
    )
    return {"success": True, "settings": new_settings}


@router.get("/admins")
async def get_admins(current_user: dict = Depends(RequireRole(["admin"]))):
    users_collection = get_db()["users"]
    admins_cursor = users_collection.find(
        {"role": {"$in": ["admin", "superadmin", "moderator"]}}
    )
    admins_list = await admins_cursor.to_list(100)

    formatted_admins = []
    for admin in admins_list:
        name = admin.get("name", "Unknown Admin")
        parts = name.split(" ")
        avatar = (
            (parts[0][0] + parts[-1][0]).upper()
            if len(parts) > 1
            else parts[0][:2].upper() if name else "AD"
        )

        formatted_admins.append(
            {
                "id": str(admin["_id"]),
                "user": name,
                "email": admin.get("email", ""),
                "role": admin.get("role", "admin").title(),
                "avatar": avatar,
            }
        )
    return formatted_admins


@router.delete("/admins/{admin_id}")
async def remove_admin(
    admin_id: str, current_user: dict = Depends(RequireRole(["admin"]))
):
    # In a real app we'd change their role to 'student' or 'user' rather than deleting the account
    users_collection = get_db()["users"]
    result = await users_collection.update_one(
        {"_id": ObjectId(admin_id)}, {"$set": {"role": "student"}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {"success": True}


@router.get("/platform-analytics")
async def get_platform_analytics(current_user: dict = Depends(RequireRole(["admin"]))):
    """Get platform-wide analytics for the admin dashboard"""
    db = get_db()
    users_collection = db["users"]
    hackathons_collection = db["hackathons"]
    teams_collection = db["teams"]
    eval_collection = db["evaluations"]

    # 1. Basic Metrics
    total_users = await users_collection.count_documents({})
    active_hackathons = await hackathons_collection.count_documents({"status": "Live"})
    total_teams = await teams_collection.count_documents({})

    # 2. Registration Trend (Simplified)
    months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
    ]
    registration_data = []
    for i, month in enumerate(months):
        # In a real app, we'd query by date ranges. For now, we mix some real total with distribution.
        val = (total_users // 12) + (i * 10)  # Mock distribution
        registration_data.append(
            {"month": month, "value": val, "current": i == (datetime.now().month - 1)}
        )

    # 3. Growth Data
    growth_data = [
        {"month": m, "value": val - 20, "current": d["current"]}
        for m, val, d in zip(
            months, [r["value"] for r in registration_data], registration_data
        )
    ]

    # 4. Recent Reviews (from Evaluations)
    recent_evals = (
        await eval_collection.find().sort("evaluatedAt", -1).limit(5).to_list(5)
    )
    reviews = []
    for ev in recent_evals:
        judge_id = ev.get("judgeId")
        judge = None
        if judge_id and ObjectId.is_valid(judge_id):
            judge = await users_collection.find_one({"_id": ObjectId(judge_id)})

        reviews.append(
            {
                "id": str(ev["_id"]),
                "name": judge["name"] if judge else "Guest Evaluator",
                "role": judge["role"].title() if judge else "Judge",
                "avatar": f"https://ui-avatars.com/api/?name={judge['name'].replace(' ', '+') if judge else 'Judge'}&background=random",
                "rating": (
                    min(5, (ev["totalScore"] // 20) + 1) if ev.get("totalScore") else 4
                ),
                "feedback": ev.get("feedback", "No feedback provided"),
                "time": "Recent",
            }
        )

    # Default reviews if none exist
    if not reviews:
        reviews = [
            {
                "id": "r1",
                "name": "System Auditor",
                "role": "Admin",
                "avatar": "https://ui-avatars.com/api/?name=Admin&background=3b82f6",
                "rating": 5,
                "feedback": "Platform stability is optimal. Monitoring tools active.",
                "time": "1d ago",
            }
        ]

    return {
        "metrics": {
            "newUsers": {"value": total_users, "growth": "+12%", "isPositive": True},
            "activeEntities": {
                "value": active_hackathons,
                "growth": "+5%",
                "isPositive": True,
            },
            "satisfaction": {
                "value": 4.9,
                "subtitle": f"{len(reviews)} active reviews",
            },
        },
        "registrationData": registration_data,
        "growthData": growth_data,
        "reviews": reviews,
    }


# --- Users Management ---


@router.get("/users")
async def get_all_users(current_user: dict = Depends(RequireRole(["admin"]))):
    """Fetch all platform users for the admin users management view."""
    db = get_db()
    cursor = db["users"].find().sort("createdAt", -1)
    users = await cursor.to_list(200)

    result = []
    for u in users:
        name = u.get("name", "Unknown")
        result.append(
            {
                "id": str(u["_id"]),
                "name": name,
                "email": u.get("email", ""),
                "role": u.get("role", "student").title(),
                "status": "Suspended" if not u.get("is_active", True) else "Active",
                "joinedDate": (
                    u["createdAt"].strftime("%b %d, %Y")
                    if u.get("createdAt")
                    else "N/A"
                ),
                "avatar": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random",
            }
        )

    return result


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str, body: dict, current_user: dict = Depends(RequireRole(["admin"]))
):
    """Suspend or reactivate a user account."""
    db = get_db()
    new_status = body.get("status", "Active")
    is_active = new_status != "Suspended"

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"is_active": is_active}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True}
