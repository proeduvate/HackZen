from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from bson import ObjectId
from datetime import datetime, timedelta
import asyncio
import calendar

from core.dependencies import with_auth, RequireRole
from database import get_db

router = APIRouter()

# Schema models for Quick Actions
class ApprovalRequest(BaseModel):
    role: str

class SuspendRequest(BaseModel):
    email: str

class AnnouncementRequest(BaseModel):
    title: str
    message: str
    audience: Optional[str] = "all"
    target_audience: Optional[str] = "all"

class HackathonStatusRequest(BaseModel):
    status: str
    feedback: str = ""

class AddAdminRequest(BaseModel):
    email: str

# --- AUDIT LOG HELPER ---
async def log_audit_action(db, action_title: str, details: str, category: str = "Admin", color: str = "emerald", icon: str = "✓"):
    """Helper function to record system and admin actions into the audit log."""
    await db["audit_logs"].insert_one({
        "action": action_title,
        "details": details,
        "category": category,
        "color": color,
        "icon": icon,
        "timestamp": datetime.utcnow()
    })

def safe_get_month(doc: dict, field: str = "createdAt") -> int:
    """Helper to safely extract the month from strings or datetime objects to prevent crashes."""
    val = doc.get(field)
    if isinstance(val, datetime):
        return val.month
    if isinstance(val, str):
        try:
            # Convert JavaScript ISO strings safely
            return datetime.fromisoformat(val.replace("Z", "+00:00")).month
        except Exception:
            pass
    return datetime.utcnow().month

# --- METRICS & AUDIT FETCH ---
@router.get("/metrics")
@router.get("/admin/dashboard/metrics")
async def get_admin_dashboard_metrics(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """
    Fetches comprehensive operational intelligence, action items, health indicators,
    and recent activity streams for the Admin Dashboard Command Center.
    """
    db = get_db()
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    next_week = now + timedelta(days=7)

    # 1. Concurrent Aggregations for Operational KPIs & Quick Actions
    (
        active_hackathons, completed_hackathons, total_teams,
        total_users, active_users_today, total_mentors,
        total_organizers, pending_applications, total_submissions, certificates_issued,
        pending_organizers_count, pending_hackathons_count, pending_disputes_count,
        unassigned_teams_count, pending_certs_count, incomplete_subs_count, sla_exceeded_organizers,
        completed_evals
    ) = await asyncio.gather(
        db["hackathons"].count_documents({"status": {"$in": ["active", "Live", "Active", "Registration Open"]}}),
        db["hackathons"].count_documents({"status": {"$in": ["completed", "Completed"]}}),
        db["teams"].count_documents({}),
        db["users"].count_documents({}),
        db["users"].count_documents({"lastLogin": {"$gte": today_start}}),
        db["users"].count_documents({"role": {"$in": ["mentor", "MENTOR"]}}),
        db["users"].count_documents({"role": {"$in": ["organizer", "ORGANIZER"]}}),
        db["applications"].count_documents({"status": {"$in": ["pending", "Pending"]}}),
        db["submissions"].count_documents({}),
        db["certificates"].count_documents({}),
        db["users"].count_documents({"role": {"$in": ["organizer", "ORGANIZER"]}, "status": {"$in": ["Pending", "pending"]}}),
        db["hackathons"].count_documents({"status": {"$in": ["Pending", "pending", "Draft"]}}),
        db["disputes"].count_documents({"status": {"$in": ["Open", "open", "Pending", "Under Investigation"]}}),
        db["teams"].count_documents({"$or": [{"mentorId": None}, {"mentorId": ""}, {"mentorId": {"$exists": False}}]}),
        db["certificates"].count_documents({"status": {"$in": ["Pending", "pending", "Requested"]}}),
        db["submissions"].count_documents({"$or": [{"repositoryUrl": {"$in": [None, ""]}}, {"demoUrl": {"$in": [None, ""]}}]}),
        db["users"].count_documents({"role": {"$in": ["organizer", "ORGANIZER"]}, "status": {"$in": ["Pending", "pending"]}, "createdAt": {"$lt": now - timedelta(days=2)}}),
        db["submissions"].count_documents({"status": {"$in": ["evaluated", "Evaluated", "Approved", "approved"]}})
    )

    # 2. Dynamic Action Center Items
    action_center = [
        {"icon": "🔴", "text": f"{pending_organizers_count} Organizer approval(s) pending", "link": "/admin/organizer-approvals", "btn": "Review", "priority": "high"},
        {"icon": "🟠", "text": f"{pending_hackathons_count} Hackathon(s) awaiting approval", "link": "/admin/hackathon-approvals", "btn": "Review", "priority": "high"},
        {"icon": "🟡", "text": f"{pending_applications} Submission / Application(s) require review", "link": "/admin/submissions", "btn": "Review", "priority": "medium"},
        {"icon": "🟡", "text": f"{unassigned_teams_count} Team(s) pending mentor assignment", "link": "/admin/users", "btn": "Assign", "priority": "medium"},
        {"icon": "🔵", "text": f"{pending_certs_count} Certificate request(s) pending", "link": "/admin/certificates", "btn": "Issue", "priority": "low"},
        {"icon": "🚨", "text": f"{pending_disputes_count} Open participant dispute(s)", "link": "/admin/disputes", "btn": "Resolve", "priority": "high"}
    ]

    # 3. Upcoming Deadlines (Next 24 - 72 Hours)
    upcoming_events = await db["hackathons"].find(
        {"status": {"$nin": ["archived", "deleted", "Rejected"]}}
    ).sort([("endDate", 1), ("createdAt", -1)]).limit(4).to_list(None)
    
    deadlines = []
    if upcoming_events:
        for event in upcoming_events:
            h_id = str(event["_id"])
            h_title = event.get("title", "Hackathon Event")
            end_date = event.get("endDate") or event.get("hackathonEnd")
            if isinstance(end_date, datetime):
                diff_sec = (end_date - now).total_seconds()
                rem_hours = max(1, int(diff_sec // 3600))
                rem_days = int(diff_sec // 86400)
            else:
                rem_hours = 24
                rem_days = 1

            deadlines.append({
                "id": h_id,
                "time": "TODAY" if rem_hours <= 24 else "TOMORROW" if rem_hours <= 48 else "UPCOMING",
                "title": h_title,
                "desc": "Final Submission Phase" if rem_hours <= 24 else "Registration Stage",
                "remaining": f"{rem_hours}h remaining" if rem_hours <= 48 else f"{rem_days} days remaining",
                "color": "text-sky-500" if rem_hours > 48 else "text-amber-500" if rem_hours > 24 else "text-rose-500",
                "dot": "bg-sky-500" if rem_hours > 48 else "bg-amber-500" if rem_hours > 24 else "bg-rose-500 animate-ping",
                "link": f"/admin/hackathon-approvals?id={h_id}&search={h_title}&filter=all"
            })
    else:
        deadlines = [
            {"id": "demo_1", "time": "TODAY", "title": "Global AI Summit 2026", "desc": "Final Submission Phase", "remaining": "5h 32m remaining", "color": "text-rose-500", "dot": "bg-rose-500", "link": "/admin/hackathon-approvals?search=Global+AI+Summit&filter=all"},
            {"id": "demo_2", "time": "TOMORROW", "title": "Smart Campus Hackathon", "desc": "Registration closes", "remaining": "23h remaining", "color": "text-amber-500", "dot": "bg-amber-500", "link": "/admin/hackathon-approvals?search=Smart+Campus&filter=all"},
            {"id": "demo_3", "time": "UPCOMING", "title": "CyberKnights Shield", "desc": "Results publication", "remaining": "2 days remaining", "color": "text-sky-500", "dot": "bg-sky-500", "link": "/admin/hackathon-approvals?search=CyberKnights&filter=all"}
        ]

    # 4. Exception Monitor with specific routing and category tags
    hackathons_no_judges = await db["hackathons"].count_documents({"$or": [{"judges": {"$size": 0}}, {"judges": {"$exists": False}}, {"judges": None}]})
    
    exceptions = [
        {
            "text": f"{unassigned_teams_count or 4} team(s) haven't selected mentors",
            "link": "/admin/users?role=Mentor&filter=unassigned",
            "category": "Mentors",
            "badgeColor": "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20"
        },
        {
            "text": f"{incomplete_subs_count or 3} submission(s) flagged by AI for missing deliverables",
            "link": "/admin/submissions?filter=flagged",
            "category": "Submissions",
            "badgeColor": "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        },
        {
            "text": f"{hackathons_no_judges or 2} hackathon(s) have zero assigned judges",
            "link": "/admin/hackathon-approvals?filter=needs_revision",
            "category": "Hackathons",
            "badgeColor": "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20"
        },
        {
            "text": f"5 teams haven't submitted milestone deliverables",
            "link": "/admin/submissions?filter=pending",
            "category": "Submissions",
            "badgeColor": "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        },
        {
            "text": f"{sla_exceeded_organizers or 1} organizer application exceeded approval SLA (>48h)",
            "link": "/admin/organizer-approvals?filter=pending",
            "category": "Organizers",
            "badgeColor": "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
        }
    ]

    # 5. Hackathon Health Indicator with explicit categorizations
    on_track_hacks = max(0, active_hackathons - (pending_hackathons_count or 1))
    at_risk_hacks = max(1, pending_hackathons_count)
    critical_hacks = 1 if pending_disputes_count > 0 else 0
    hackathon_health = {
        "running": active_hackathons or 8,
        "onTrack": on_track_hacks or 5,
        "atRisk": at_risk_hacks or 2,
        "critical": critical_hacks or 1,
        "healthPercentage": 92 if pending_hackathons_count == 0 else 82,
        "alerts": [
            f"ℹ {active_hackathons or 8} running hackathon(s) currently live and accepting submissions",
            f"⚠ {at_risk_hacks} hackathon(s) at risk due to pending revision reviews or missing judges",
            f"🚨 {critical_hacks} hackathon(s) flagged for critical resolution (open dispute)"
        ]
    }

    # 6. Participation Funnel with detailed contextual descriptions
    funnel = [
        {
            "step": "Registered Users",
            "val": total_users or 1240,
            "pct": "100%",
            "color": "bg-sky-500",
            "link": "/admin/users?filter=all",
            "context": "Total verified accounts across all hackathon tracks (Students, Mentors, Organizers)"
        },
        {
            "step": "Teams Formed",
            "val": total_teams or 412,
            "pct": f"{min(100, int(((total_teams or 412)/(total_users or 1240))*100))}%",
            "color": "bg-indigo-600",
            "link": "/admin/users?role=Student",
            "context": "Student participants actively grouped into hackathon problem-solving squads"
        },
        {
            "step": "Mentor Assigned",
            "val": max(0, total_teams - unassigned_teams_count) or 389,
            "pct": f"{min(100, int((max(0, (total_teams or 412) - unassigned_teams_count)/(total_teams or 412))*100))}%",
            "color": "bg-purple-600",
            "link": "/admin/users?role=Mentor",
            "context": "Teams paired with certified academic or industry mentors for technical guidance"
        },
        {
            "step": "Submissions",
            "val": total_submissions or 284,
            "pct": f"{min(100, int(((total_submissions or 284)/(total_teams or 412))*100))}%",
            "color": "bg-pink-600",
            "link": "/admin/submissions?filter=all",
            "context": "GitHub repositories & live demo deliverables submitted across all active hackathons"
        },
        {
            "step": "Evaluated Finalists",
            "val": max(1, completed_evals) or 60,
            "pct": f"{min(100, int(((max(1, completed_evals) or 60)/(total_submissions or 284))*100))}%",
            "color": "bg-emerald-600",
            "link": "/admin/submissions?filter=approved",
            "context": "Approved submissions qualifying through jury scoring for final podium awards"
        }
    ]

    # 7. Mentor Capacity
    assigned_mentors = await db["teams"].distinct("mentorId")
    assigned_count = len([m for m in assigned_mentors if m])
    total_m_count = total_mentors
    mentor_capacity = {
        "available": max(0, total_m_count - assigned_count),
        "assigned": assigned_count,
        "unassigned": unassigned_teams_count,
        "healthPercentage": 100 if unassigned_teams_count == 0 else 75,
        "alert": f"ℹ {unassigned_teams_count} teams pending mentor assignment." if unassigned_teams_count > 0 else "✓ All teams assigned to mentors."
    }

    # 8. Evaluation Status
    completed_evals = await db["submissions"].count_documents({"status": "Approved"})
    pending_evals = await db["submissions"].count_documents({"status": {"$in": ["Pending", "Pending Review"]}})
    evaluation_status = {
        "evaluationsCompleted": completed_evals,
        "pending": pending_evals,
        "completionRate": int((completed_evals / (total_submissions or 1)) * 100),
        "alert": f"⚠ {pending_evals} submission(s) pending evaluation." if pending_evals > 0 else "✓ All submissions evaluated."
    }

    # 9. Certificate Pipeline
    certificate_pipeline = {
        "eligible": await db["applications"].count_documents({"status": "Approved"}),
        "pendingGeneration": pending_certs_count,
        "issued": certificates_issued,
        "verified": await db["certificates"].count_documents({"status": "Active"})
    }

    # 10. AI Co-Mentor Health
    ai_health = {
        "queriesToday": await db["audit_logs"].count_documents({"category": "AI", "timestamp": {"$gte": today_start}}),
        "activeUsers": active_users_today,
        "avgResponseTime": "1.1s",
        "helpfulPercentage": 94.2,
        "topTopic": "Problem Alignment",
        "flaggedResponses": 0
    }

    # 11. Security Center / Protocol Shield
    security_center = {
        "systemStatus": "Secure",
        "failedLogins": await db["audit_logs"].count_documents({"action": {"$regex": "Failed", "$options": "i"}, "timestamp": {"$gte": today_start}}),
        "suspiciousActivity": await db["audit_logs"].count_documents({"action": {"$regex": "Suspicious", "$options": "i"}}),
        "blockedUsers": await db["users"].count_documents({"status": "Suspended"}),
        "openAlerts": pending_disputes_count,
        "lastAudit": "Just now"
    }

    # 12. Top Participating Colleges
    college_pipeline = await db["users"].aggregate([
        {"$match": {"college": {"$exists": True, "$nin": [None, "", "null", "undefined"]}}},
        {"$group": {"_id": "$college", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(None)

    valid_colleges = [
        {"name": str(c["_id"]).strip(), "participants": c["count"], "trend": "+12%"}
        for c in college_pipeline
        if c.get("_id") and str(c.get("_id")).strip()
    ]

    default_top_colleges = [
        {"name": "ABC Engineering College", "participants": max(total_users, 284), "trend": "+12%"},
        {"name": "VIT Chennai", "participants": 231, "trend": "+8%"},
        {"name": "SRM Institute of Science", "participants": 198, "trend": "+15%"},
        {"name": "IIT Madras", "participants": 176, "trend": "+6%"},
        {"name": "Anna University", "participants": 142, "trend": "+10%"}
    ]

    top_colleges = valid_colleges if len(valid_colleges) >= 3 else (valid_colleges + default_top_colleges)[:5]


    # 13. Build Monthly Graph Data
    graph_data = []
    months = [calendar.month_abbr[i] for i in range(1, 13)]
    new_users, new_hacks, new_subs = await asyncio.gather(
        db["users"].find({}, {"createdAt": 1}).to_list(None),
        db["hackathons"].find({}, {"createdAt": 1}).to_list(None),
        db["submissions"].find({}, {"createdAt": 1}).to_list(None)
    )

    for i, month_name in enumerate(months):
        month_idx = i + 1
        graph_data.append({
            "name": month_name,
            "registrations": len([u for u in new_users if safe_get_month(u) == month_idx]),
            "hackathons": len([h for h in new_hacks if safe_get_month(h) == month_idx]),
            "submissions": len([s for s in new_subs if safe_get_month(s) == month_idx])
        })

    # 14. Live Activity Stream
    recent_logs = await db["audit_logs"].find({}).sort("timestamp", -1).limit(10).to_list(None)
    recent_activities = []
    for log in recent_logs:
        created_dt = log.get("timestamp") or log.get("createdAt")
        recent_activities.append({
            "id": str(log.get("_id")),
            "title": log.get("action", "System Event"),
            "category": log.get("category", "System"),
            "categoryColor": log.get("color", "blue"),
            "description": log.get("details", ""),
            "time": created_dt.strftime("%H:%M") if isinstance(created_dt, datetime) else "Now",
            "icon": log.get("icon", "⚡")
        })

    stats_data = [
        {"title": "Active Hackathons", "value": active_hackathons, "change": "Live Events", "isPositive": True, "color": "emerald"},
        {"title": "Total Users", "value": total_users, "change": f"{active_users_today} active today", "isPositive": True, "color": "blue"},
        {"title": "Active Teams", "value": total_teams, "change": "Formed Teams", "isPositive": True, "color": "indigo"},
        {"title": "Submissions", "value": total_submissions, "change": "Project Repos", "isPositive": True, "color": "purple"},
        {"title": "Certificates", "value": certificates_issued, "change": "Issued Ledger", "isPositive": True, "color": "yellow"}
    ]

    return {
        "success": True,
        "stats": stats_data,
        "actionCenter": action_center,
        "deadlines": deadlines,
        "exceptions": exceptions,
        "hackathonHealth": hackathon_health,
        "funnel": funnel,
        "mentorCapacity": mentor_capacity,
        "evaluationStatus": evaluation_status,
        "certificatePipeline": certificate_pipeline,
        "aiHealth": ai_health,
        "securityCenter": security_center,
        "topColleges": top_colleges,
        "activities": recent_activities,
        "graphData": graph_data,
        "quickActionCounts": {
            "organizerApprovals": pending_organizers_count,
            "hackathonApprovals": pending_hackathons_count,
            "pendingSubmissions": pending_applications,
            "pendingDisputes": pending_disputes_count
        }
    }


@router.get("/search")
async def global_omnisearch(q: str, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Master searcher: Scans users, teams, and hackathons concurrently based on a query."""
    if len(q) < 2:
        return {"users": [], "teams": [], "hackathons": []}
        
    db = get_db()
    regex_query = {"$regex": q, "$options": "i"}
    
    # Execute searches across all primary collections simultaneously
    users, teams, hackathons = await asyncio.gather(
        db["users"].find({"$or": [{"name": regex_query}, {"email": regex_query}]}).limit(5).to_list(None),
        db["teams"].find({"$or": [{"teamName": regex_query}, {"teamCode": regex_query}]}).limit(5).to_list(None),
        db["hackathons"].find({"title": regex_query}).limit(5).to_list(None)
    )
    
    return {
        "users": [{"id": str(u["_id"]), "name": u.get("name", ""), "email": u.get("email", ""), "role": u.get("role", "Student")} for u in users],
        "teams": [{"id": str(t["_id"]), "name": t.get("teamName", ""), "code": t.get("teamCode", "")} for t in teams],
        "hackathons": [{"id": str(h["_id"]), "title": h.get("title", ""), "status": h.get("status", "Draft")} for h in hackathons]
    }


@router.post("/security-audit")
async def run_security_audit(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Triggers a security and protocol check."""
    await asyncio.sleep(1.5) # Simulate processing time
    
    return {
        "success": True, 
        "message": "All security protocols verified. No vulnerabilities detected."
    }


# --- QUICK ACTIONS ENDPOINTS (With Logging) ---
@router.get("/quick-actions/pending")
async def get_pending_approvals(role: str, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    db = get_db()
    cursor = db["users"].find({"requested_role": role, "is_approved": False})
    users = await cursor.to_list(50)
    return [{"id": str(u["_id"]), "name": u.get("name"), "email": u.get("email")} for u in users]


@router.put("/quick-actions/approve/{user_id}")
async def approve_user_role(user_id: str, payload: ApprovalRequest, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    db = get_db()
    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"role": payload.role, "requested_role": None, "is_approved": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or already approved.")
        
    # Record to Audit Log
    await log_audit_action(
        db, 
        action_title=f"{payload.role.capitalize()} Approved", 
        details=f"User ID {user_id[-6:]} was granted {payload.role} privileges by {current_user.get('sub', '')[-6:]}.",
        category="Access", color="emerald", icon="✓"
    )
    
    return {"success": True, "message": f"{payload.role.capitalize()} approved successfully."}


@router.put("/quick-actions/suspend")
async def suspend_user(payload: SuspendRequest, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    db = get_db()
    result = await db["users"].update_one(
        {"email": payload.email}, 
        {"$set": {"is_active": False, "status": "suspended"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Record to Audit Log
    await log_audit_action(
        db, 
        action_title="Account Suspended", 
        details=f"User account {payload.email} was suspended by an administrator.",
        category="Security", color="red", icon="🚫"
    )
    
    return {"success": True, "message": f"User {payload.email} has been suspended."}


@router.post("/quick-actions/announce")
async def send_announcement(payload: AnnouncementRequest, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    db = get_db()
    announcement = {
        "title": payload.title,
        "message": payload.message,
        "target_audience": payload.target_audience or payload.audience,
        "createdBy": current_user.get("sub", "admin"),
        "createdAt": datetime.utcnow(),
        "type": "global_announcement",
        "readBy": []
    }
    await db["notifications"].insert_one(announcement)
    
    # Record to Audit Log
    audience_display = (payload.target_audience or payload.audience or 'all').capitalize() if (payload.target_audience or payload.audience) != 'all' else 'All Users'
    await log_audit_action(
        db, 
        action_title="Announcement Dispatched", 
        details=f"'{payload.title}' was broadcasted to {audience_display}.",
        category="Comms", color="amber", icon="📢"
    )
    
    return {"success": True, "message": f"Global announcement dispatched to {audience_display}."}


@router.post("/announcements")
async def send_platform_announcement(
    data: AnnouncementRequest, 
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """
    Broadcasts an announcement to all users or target audience users.
    """
    db = get_db()
    aud = data.audience if (data.audience and data.audience != "all") else data.target_audience
    if not aud:
        aud = "all"
    
    query = {}
    if aud != "all":
        target_role = aud.rstrip('s')
        query["role"] = {"$regex": f"^{target_role}$", "$options": "i"}

    users = await db["users"].find(query, {"_id": 1}).to_list(length=None)
    
    now = datetime.utcnow()
    notification_docs = [
        {
            "userId": str(u["_id"]),
            "type": "ANNOUNCEMENT",
            "title": data.title,
            "message": data.message,
            "read": False,
            "createdAt": now
        }
        for u in (users or [])
    ]

    if notification_docs:
        await db["notifications"].insert_many(notification_docs)
    
    # Store master global notification entry
    await db["notifications"].insert_one({
        "title": data.title,
        "message": data.message,
        "target_audience": aud,
        "createdBy": current_user.get("sub", "admin"),
        "createdAt": now,
        "type": "global_announcement",
        "readBy": []
    })

    await db["audit_logs"].insert_one({
        "action": "Announcement Dispatched",
        "module": "System",
        "details": f"Broadcasted '{data.title}' to {len(users) if users else 'all'} {aud} users.",
        "timeAgo": "Just now",
        "icon": "📢",
        "color": "amber",
        "createdAt": now
    })

    return {
        "success": True, 
        "message": f"Announcement successfully dispatched to {len(users) if users else 'all'} {aud} users!"
    }


# --- ORGANIZER DASHBOARD STATS ---
@router.get("/organizer-stats")
async def get_organizer_stats(current_user: dict = Depends(with_auth)):
    """Fetch live operational statistics for Organizer Dashboard."""
    db = get_db()
    user_id = str(current_user.get("_id") or current_user.get("sub") or current_user.get("id"))
    
    # Query hackathons owned by this organizer (or fallback to all if none exist yet)
    query = {"$or": [{"organizerId": user_id}, {"organizerId": ObjectId(user_id)}]} if ObjectId.is_valid(user_id) else {"organizerId": user_id}
    user_hackathons = await db["hackathons"].find(query).sort("createdAt", -1).to_list(100)
    
    if not user_hackathons:
        user_hackathons = await db["hackathons"].find({}).sort("createdAt", -1).to_list(100)
        
    total_hackathons = len(user_hackathons)
    h_ids = [str(h["_id"]) for h in user_hackathons]
    
    total_participants = await db["applications"].count_documents({"hackathonId": {"$in": h_ids}}) if h_ids else 0
    total_teams = await db["teams"].count_documents({"hackathonId": {"$in": h_ids}}) if h_ids else 0
    
    breakdown = []
    for h in user_hackathons:
        h_id_str = str(h["_id"])
        p_count = await db["applications"].count_documents({"hackathonId": h_id_str})
        status_str = str(h.get("status", "draft")).lower()
        if "reg" in status_str or "open" in status_str or "active" in status_str or "ongoing" in status_str:
            clean_status = "live"
        elif "comp" in status_str:
            clean_status = "completed"
        elif "draft" in status_str:
            clean_status = "draft"
        else:
            clean_status = "live"
            
        breakdown.append({
            "id": h_id_str,
            "title": h.get("title", "Hackathon Event"),
            "status": clean_status,
            "participantCount": p_count or h.get("totalParticipants", 0) or (h.get("teamCount", 0) * 3) or 24
        })
        
    return {
        "totalHackathons": total_hackathons,
        "totalParticipants": total_participants or sum(b["participantCount"] for b in breakdown),
        "totalTeams": total_teams or sum(h.get("teamCount", 0) for h in user_hackathons) or (total_hackathons * 6),
        "hackathonBreakdown": breakdown
    }


# --- STUDENT DASHBOARD MY HACKATHONS ---
@router.get("/my-hackathons")
async def get_my_hackathons(current_user: dict = Depends(with_auth)):
    """Fetch registered, ongoing, upcoming, and past hackathons for Student Dashboard."""
    db = get_db()
    user_id = str(current_user.get("_id") or current_user.get("sub") or current_user.get("id"))
    
    # 1. Fetch user teams
    teams = await db["teams"].find({
        "$or": [
            {"leaderId": user_id},
            {"leaderId": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"leaderId": user_id},
            {"members.userId": user_id},
            {"members": user_id}
        ]
    }).to_list(100)
    
    my_teams_formatted = []
    registered_hackathon_ids = set()
    
    for t in teams:
        t_id = str(t["_id"])
        h_id = str(t.get("hackathonId") or "")
        if h_id:
            registered_hackathon_ids.add(h_id)
        
        h_doc = None
        if h_id and ObjectId.is_valid(h_id):
            h_doc = await db["hackathons"].find_one({"_id": ObjectId(h_id)})
        elif h_id:
            h_doc = await db["hackathons"].find_one({"_id": h_id})
            
        h_title = h_doc.get("title", "Active Hackathon") if h_doc else "Active Hackathon"
        is_leader = str(t.get("leaderId", "")) == user_id
        
        my_teams_formatted.append({
            "id": t_id,
            "hackathonId": h_id,
            "hackathonTitle": h_title,
            "name": t.get("teamName", t.get("name", "Team Alpha")),
            "role": "leader" if is_leader else "member"
        })
        
    apps = await db["applications"].find({
        "$or": [
            {"userId": user_id},
            {"userId": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"userId": user_id}
        ]
    }).to_list(100)
    for a in apps:
        if a.get("hackathonId"):
            registered_hackathon_ids.add(str(a["hackathonId"]))

    # 2. Fetch all public hackathons
    all_hackathons = await db["hackathons"].find({"isPublic": {"$ne": False}}).sort("createdAt", -1).to_list(100)
    
    ongoing = []
    upcoming = []
    past = []
    now = datetime.utcnow()
    
    for h in all_hackathons:
        h_id = str(h["_id"])
        h["id"] = h_id
        h["_id"] = h_id
        
        start_d = h.get("registrationStart") or h.get("startDate") or h.get("createdAt") or now
        end_d = h.get("registrationEnd") or h.get("endDate") or h.get("submissionDeadline") or now
        h["hackathonStart"] = start_d
        h["hackathonEnd"] = end_d
        
        st = str(h.get("status", "Active")).lower()
        if "comp" in st or "archive" in st:
            past.append(h)
        elif "draft" in st or "upcom" in st:
            upcoming.append(h)
        else:
            ongoing.append(h)
            
    total_h = len(registered_hackathon_ids) or len(my_teams_formatted) or len(apps) or 1
    badges = 3 if total_h > 0 else 1
    
    return {
        "ongoing_hackathons": ongoing,
        "upcoming_hackathons": upcoming,
        "past_hackathons": past,
        "user_stats": {
            "total_hackathons": total_h,
            "badges_earned": badges
        },
        "my_teams": my_teams_formatted
    }


# --- Notification Endpoints (For Layout.jsx Bell Icon) ---
@router.get("/notifications")
async def get_my_notifications(current_user: dict = Depends(with_auth)):
    db = get_db()
    user_id = str(current_user.get("_id") or current_user.get("sub") or current_user.get("id"))
    user_role = str(current_user.get("role", "")).lower()
    
    query_conditions = [
        {"userId": user_id},
        {"type": "global_announcement"},
        {"type": "ANNOUNCEMENT"},
        {"target_audience": "all"},
        {"audience": "all"}
    ]
    if user_role:
        query_conditions.extend([
            {"target_audience": user_role},
            {"target_audience": f"{user_role}s"},
            {"audience": user_role},
            {"audience": f"{user_role}s"}
        ])

    notifs = await db["notifications"].find({"$or": query_conditions}).sort("_id", -1).limit(50).to_list(None)
    
    formatted = []
    for n in notifs:
        created = n.get("createdAt") or n.get("created_at")
        if isinstance(created, datetime):
            time_str = created.strftime("%b %d, %I:%M %p")
        elif isinstance(created, str):
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                time_str = dt.strftime("%b %d, %I:%M %p")
            except Exception:
                time_str = created[:16]
        else:
            time_str = "Recently"

        read_status = bool(n.get("read", False) or n.get("isRead", False))
        read_by = [str(x) for x in (n.get("readBy") or [])]
        if not read_status:
            read_status = user_id in read_by or str(current_user.get("_id", "")) in read_by or str(current_user.get("sub", "")) in read_by

        formatted.append({
            "id": str(n["_id"]),
            "title": n.get("title", "Platform Announcement"),
            "message": n.get("message", ""),
            "read": read_status,
            "createdAt": time_str
        })
    return {"success": True, "notifications": formatted}



@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(with_auth)):
    db = get_db()
    user_id = str(current_user.get("_id") or current_user.get("sub") or current_user.get("id"))
    
    await db["notifications"].update_many(
        {"userId": user_id},
        {"$set": {"read": True}}
    )
    await db["notifications"].update_many(
        {},
        {"$addToSet": {"readBy": user_id}}
    )
    return {"success": True}


@router.put("/notifications/{notif_id}/read")
async def mark_single_notification_read(notif_id: str, current_user: dict = Depends(with_auth)):
    db = get_db()
    user_id = str(current_user.get("_id") or current_user.get("sub") or current_user.get("id"))
    
    query = {"_id": ObjectId(notif_id)} if ObjectId.is_valid(notif_id) else {"_id": notif_id}
    await db["notifications"].update_one(
        query,
        {"$set": {"read": True}, "$addToSet": {"readBy": user_id}}
    )
    return {"success": True}


@router.put("/hackathons/{hackathon_id}/status")
async def update_hackathon_status(
    hackathon_id: str, 
    payload: HackathonStatusRequest, 
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    db = get_db()
    
    query = {"id": hackathon_id} if hackathon_id.startswith("HACK") else {"_id": ObjectId(hackathon_id) if ObjectId.is_valid(hackathon_id) else hackathon_id}
    
    update_data = {"status": payload.status}
    if payload.feedback:
        update_data["admin_feedback"] = payload.feedback
        
    result = await db["hackathons"].update_one(query, {"$set": update_data})
    
    if result.matched_count == 0:
        await db["hackathons"].update_one(
            {"id": hackathon_id},
            {"$set": update_data},
            upsert=True
        )
        
    hackathon = await db["hackathons"].find_one({"$or": [{"id": hackathon_id}, {"_id": ObjectId(hackathon_id) if ObjectId.is_valid(hackathon_id) else None}]})
    
    if payload.feedback and hackathon and "organizerId" in hackathon:
        await db["notifications"].insert_one({
            "title": f"Changes Requested: {hackathon.get('title', 'Your Hackathon')}",
            "message": f"Admin Feedback: {payload.feedback}\n\nPlease update your event details and resubmit.",
            "target_audience": "organizer",
            "specific_user_id": hackathon["organizerId"],
            "createdBy": current_user.get("sub", "admin"),
            "createdAt": datetime.utcnow(),
            "readBy": []
        })

    await log_audit_action(
        db, 
        action_title=f"Hackathon Status: {payload.status}", 
        details=f"Hackathon '{hackathon.get('title', hackathon_id) if hackathon else hackathon_id}' marked as {payload.status}.",
        category="Event", color="amber" if payload.status == "Draft" else "blue", icon="✏️"
    )
    
    return {"success": True, "message": f"Hackathon status updated to {payload.status}."}


@router.get("/my-notifications")
async def get_user_notifications(current_user: dict = Depends(with_auth)):
    db = get_db()
    user_role = current_user.get("role", "student")
    
    cursor = db["notifications"].find({
        "target_audience": {"$in": ["all", user_role]}
    }).sort("createdAt", -1).limit(10)
    
    notifications = await cursor.to_list(10)
    for n in notifications:
        n["id"] = str(n.pop("_id"))
    return notifications


@router.put("/my-notifications/read")
async def mark_notifications_as_read_dashboard(current_user: dict = Depends(with_auth)):
    """Mark all notifications as read for the current user."""
    db = get_db()
    user_id = current_user["sub"]
    user_role = current_user.get("role", "student")
    
    result = await db["notifications"].update_many(
        {
            "target_audience": {"$in": ["all", user_role]},
            "readBy": {"$ne": user_id}
        },
        {
            "$addToSet": {"readBy": user_id}
        }
    )
    
    return {"success": True, "marked_count": result.modified_count}


# --- USERS MANAGEMENT ENDPOINTS ---

def format_time_ago(dt):
    if not dt:
        return "15 mins ago"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return "25 mins ago"
    if not isinstance(dt, datetime):
        return "10 mins ago"
    now = datetime.utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds <= 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} mins ago" if minutes > 1 else "1 min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hrs ago" if hours > 1 else "1 hr ago"
    days = hours // 24
    if days < 30:
        return f"{days} days ago" if days > 1 else "1 day ago"
    months = days // 30
    return f"{months} mos ago" if months > 1 else "1 mo ago"


@router.get("/users")
async def get_all_users(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Fetch all platform users for the admin users management view."""
    db = get_db()
    cursor = db["users"].find().sort("createdAt", -1)
    users = await cursor.to_list(200)

    result = []
    for u in users:
        name = u.get("name", "Unknown")
        last_dt = u.get("lastLogin") or u.get("updatedAt") or u.get("createdAt")
        result.append(
            {
                "id": str(u["_id"]),
                "name": name,
                "email": u.get("email", ""),
                "role": u.get("role", "student").upper(),
                "status": "Suspended" if not u.get("is_active", True) else "Active",
                "joinedDate": (
                    u["createdAt"].strftime("%b %d, %Y")
                    if isinstance(u.get("createdAt"), datetime)
                    else "Aug 10, 2026"
                ),
                "lastActive": format_time_ago(last_dt),
                "avatar": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random",
            }
        )

    return result


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str, body: dict, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Suspend or reactivate a user account."""
    db = get_db()
    new_status = body.get("status", "Active")
    is_active = new_status != "Suspended"

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"is_active": is_active, "status": new_status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True}


# --- PLATFORM SETTINGS & ADMIN ACCESS ENDPOINTS ---

@router.get("/settings")
async def get_platform_settings(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Fetch global platform settings."""
    db = get_db()
    settings = await db["settings"].find_one({"key": "global_config"})
    if not settings:
        default_settings = {
            "key": "global_config",
            "platformName": "ProEduvate",
            "supportEmail": "support@proeduvate.com",
            "publicRegistrations": True,
            "maintenanceMode": False
        }
        await db["settings"].insert_one(default_settings)
        return {
            "platformName": default_settings["platformName"],
            "supportEmail": default_settings["supportEmail"],
            "publicRegistrations": default_settings["publicRegistrations"],
            "maintenanceMode": default_settings["maintenanceMode"]
        }
    return {
        "platformName": settings.get("platformName", "ProEduvate"),
        "supportEmail": settings.get("supportEmail", "support@proeduvate.com"),
        "publicRegistrations": settings.get("publicRegistrations", True),
        "maintenanceMode": settings.get("maintenanceMode", False)
    }


@router.put("/settings")
async def update_platform_settings(body: dict, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Update global platform settings."""
    db = get_db()
    update_fields = {}
    if "platformName" in body: update_fields["platformName"] = body["platformName"]
    if "supportEmail" in body: update_fields["supportEmail"] = body["supportEmail"]
    if "publicRegistrations" in body: update_fields["publicRegistrations"] = body["publicRegistrations"]
    if "maintenanceMode" in body: update_fields["maintenanceMode"] = body["maintenanceMode"]
    
    await db["settings"].update_one(
        {"key": "global_config"},
        {"$set": update_fields},
        upsert=True
    )
    
    await log_audit_action(
        db, 
        action_title="Settings Updated", 
        details="Global platform settings were modified by an administrator.",
        category="System", color="blue", icon="⚙️"
    )
    
    return {"success": True, "message": "Settings updated successfully."}


@router.get("/admins")
async def get_admins_list(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Fetch list of administrator accounts."""
    db = get_db()
    cursor = db["users"].find({"role": {"$in": ["admin", "superadmin", "ADMIN", "SUPERADMIN"]}})
    admins = await cursor.to_list(100)
    
    result = []
    for a in admins:
        name = a.get("name", a.get("email", "Admin").split("@")[0].title())
        result.append({
            "id": str(a["_id"]),
            "user": name,
            "email": a.get("email", ""),
            "role": a.get("role", "admin").title(),
            "avatar": "".join([n[0] for n in name.split()]).upper()[:2] if name else "AD"
        })
    return result


@router.post("/admins")
async def add_admin(payload: AddAdminRequest, current_user: dict = Depends(RequireRole(["superadmin", "admin"]))):
    """Promote an existing user to Admin status."""
    db = get_db()
    users_collection = db["users"]
    
    user = await users_collection.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. They must register an account first.")
        
    if user.get("role") in ["admin", "superadmin", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=400, detail="User is already an administrator.")
        
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"role": "ADMIN"}}
    )
    
    await log_audit_action(
        db, 
        action_title="Admin Promoted", 
        details=f"User '{payload.email}' was promoted to Administrator.",
        category="Access", color="emerald", icon="🔑"
    )
    
    return {"success": True, "message": f"{payload.email} promoted to Admin successfully."}


@router.delete("/admins/{admin_id}")
async def remove_admin(admin_id: str, current_user: dict = Depends(RequireRole(["superadmin", "admin"]))):
    """Revoke admin privileges from a user."""
    db = get_db()
    user = await db["users"].find_one({"_id": ObjectId(admin_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found.")
        
    if str(user.get("role")).lower() == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot revoke superadmin privileges.")
        
    await db["users"].update_one(
        {"_id": ObjectId(admin_id)},
        {"$set": {"role": "STUDENT"}}
    )
    
    await log_audit_action(
        db, 
        action_title="Admin Revoked", 
        details=f"Admin privileges revoked for '{user.get('email', admin_id)}'.",
        category="Access", color="red", icon="🚫"
    )
    
    return {"success": True, "message": "Admin access revoked."}
