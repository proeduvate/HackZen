from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from core.dependencies import with_auth, RequireRole
from database import get_db

router = APIRouter()


@router.get("/my-hackathons")
async def get_my_hackathons_dashboard(current_user: dict = Depends(with_auth)):
    """Get dashboard view of user's hackathons"""
    users_collection = get_db()["users"]
    teams_collection = get_db()["teams"]
    members_collection = get_db()["teamMembers"]
    hackathons_collection = get_db()["hackathons"]

    # Get user memberships
    memberships = await members_collection.find(
        {"userId": current_user["sub"]}
    ).to_list(100)
    team_ids = [ObjectId(m["teamId"]) for m in memberships]

    # Get teams
    user_teams = await teams_collection.find({"_id": {"$in": team_ids}}).to_list(100)

    result = {
        "user_stats": {
            "total_hackathons": len(user_teams),
            "badges_earned": 0,
        },
        "ongoing_hackathons": [],
        "past_hackathons": [],
        "my_teams": [],
    }

    now = datetime.utcnow()

    for team in user_teams:
        hackathon = await hackathons_collection.find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )
        if not hackathon:
            continue

        team_id_str = str(team["_id"])
        role = next(
            (m["role"] for m in memberships if m["teamId"] == team_id_str), "member"
        )

        team_info = {
            "id": team_id_str,
            "name": team["teamName"],
            "hackathonId": team["hackathonId"],
            "hackathonTitle": hackathon["title"],
            "role": role,
            "createdAt": team["createdAt"],
        }
        result["my_teams"].append(team_info)

        hackathon_info = {
            "id": str(hackathon["_id"]),
            "title": hackathon["title"],
            "status": hackathon["status"],
            "startDate": hackathon["startDate"],
            "endDate": hackathon["endDate"],
        }

        if hackathon["endDate"] > now:
            result["ongoing_hackathons"].append(hackathon_info)
        else:
            result["past_hackathons"].append(hackathon_info)

    return result


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
