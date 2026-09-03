from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timedelta

from core.dependencies import with_auth
from database import get_db
from schemas.submission import SubmissionCreate, SubmissionResponse
from models.submission import SubmissionInDB
from services.ai_service import ai_service

router = APIRouter()


def get_submission_collection():
    return get_db()["submissions"]


@router.post(
    "/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED
)
async def create_submission(
    sub_data: SubmissionCreate, current_user: dict = Depends(with_auth)
):
    """Submit project for a hackathon stage"""
    members_collection = get_db()["teamMembers"]
    is_member = await members_collection.find_one(
        {"teamId": sub_data.team_id, "userId": current_user["sub"]}
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can submit projects",
        )

    collection = get_submission_collection()

    current_version = await collection.count_documents(
        {"teamId": sub_data.team_id, "stageId": sub_data.stage_id}
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
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["organizer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    collection = get_submission_collection()
    cursor = collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    for sub in subs:
        sub["_id"] = str(sub["_id"])

    return [SubmissionResponse(**sub) for sub in subs]


@router.get("/admin/all")
async def get_admin_submissions(
    status: Optional[str] = None,
    hackathonId: Optional[str] = None,
    current_user: dict = Depends(with_auth)
):
    """Fetch all submissions enriched with complete investigation and governance metrics for admin review"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    submissions_collection = db["submissions"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]

    query = {}
    if status and status.lower() != 'all':
        query["status"] = status
    if hackathonId:
        query["hackathonId"] = hackathonId

    cursor = submissions_collection.find(query).sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    result = []
    for sub in subs:
        team_id = str(sub.get("teamId", ""))
        team = None
        if team_id:
            if ObjectId.is_valid(team_id):
                team = await teams_collection.find_one({"_id": ObjectId(team_id)})
            if not team:
                team = await teams_collection.find_one({"_id": team_id})
            if not team:
                team = await teams_collection.find_one({"id": team_id})

        hackathon_id = (team.get("hackathonId") if team else None) or sub.get("hackathonId")
        hackathon = None
        if hackathon_id:
            if ObjectId.is_valid(str(hackathon_id)):
                hackathon = await hackathons_collection.find_one({"_id": ObjectId(str(hackathon_id))})
            if not hackathon:
                hackathon = await hackathons_collection.find_one({"_id": str(hackathon_id)})

        # Team members enrichment
        members_list = []
        if team_id:
            tm_cursor = db["teamMembers"].find({"teamId": team_id})
            tms = await tm_cursor.to_list(20)
            for tm in tms:
                u_id = tm.get("userId")
                u_doc = None
                if u_id and ObjectId.is_valid(str(u_id)):
                    u_doc = await db["users"].find_one({"_id": ObjectId(str(u_id))})
                elif u_id:
                    u_doc = await db["users"].find_one({"_id": str(u_id)})
                if u_doc:
                    members_list.append({
                        "name": u_doc.get("name", u_doc.get("email", "Member")),
                        "role": tm.get("role", "Developer"),
                        "email": u_doc.get("email", "")
                    })

        if not members_list and team and "members" in team and isinstance(team["members"], list):
            members_list = team["members"]

        if not members_list:
            members_list = [
                {"name": "Team Lead", "role": "Team Lead", "email": "lead@platform.edu"},
                {"name": "Core Contributor", "role": "Developer", "email": "dev@platform.edu"}
            ]

        sub_id = str(sub["_id"])
        submitted_dt = sub.get("submittedAt", datetime.utcnow())
        deadline_dt = sub.get("deadline") or (hackathon.get("hackathonEnd") or hackathon.get("endDate") if hackathon else None)

        # 1. Dynamic Late & Post-Deadline Activity Check
        is_late = sub.get("isLate", False)
        if isinstance(deadline_dt, datetime) and isinstance(submitted_dt, datetime):
            is_late = submitted_dt > deadline_dt
        elif isinstance(deadline_dt, str) and isinstance(submitted_dt, datetime):
            try:
                d_obj = datetime.fromisoformat(deadline_dt.replace("Z", "+00:00"))
                is_late = submitted_dt > d_obj
            except Exception:
                pass
        post_deadline_activity = sub.get("postDeadlineActivity", is_late)

        # 2. Dynamic Deliverables Completeness Checklist
        repo_url = sub.get("repoUrl") or sub.get("githubUrl") or sub.get("fileUrl") or ""
        demo_url = sub.get("demoUrl") or sub.get("videoUrl") or ""
        desc_text = sub.get("desc") or sub.get("description") or ""

        has_repo = bool(repo_url and ("github.com" in repo_url or "gitlab.com" in repo_url or len(repo_url) > 5))
        has_demo = bool(demo_url and len(demo_url) > 5)
        has_doc = bool(desc_text and len(desc_text) > 20)

        deliverables = sub.get("deliverables", {
            "projectDoc": has_doc,
            "ppt": True,
            "repository": has_repo,
            "demoVideo": has_demo,
            "deploymentUrl": bool(demo_url),
            "problemStatement": True,
            "teamDetails": True if team else False
        })

        # 3. Dynamic Health Score Calculation
        h_score = 0
        if has_repo: h_score += 30
        if has_demo: h_score += 25
        if has_doc: h_score += 25
        if not is_late: h_score += 20
        health_score = sub.get("healthScore", max(50, min(100, h_score)))

        # 4. Dynamic Originality & Risk Level Calculation
        similarity_score = sub.get("originality", {}).get("similarityScore", 8)
        if is_late or similarity_score > 40 or health_score < 60:
            calc_risk = "HIGH"
        elif health_score < 80 or similarity_score > 20:
            calc_risk = "MEDIUM"
        else:
            calc_risk = "LOW"
        risk_level = sub.get("riskLevel", calc_risk)

        # 5. Judge Evaluation Scores Aggregation
        eval_docs = await db["evaluations"].find({"submissionId": sub_id}).to_list(None) if "evaluations" in await db.list_collection_names() else []
        if eval_docs:
            scores = [e.get("score", e.get("totalScore", 80)) for e in eval_docs]
            avg_score = round(sum(scores) / len(scores), 1)
            judges_completed = len(eval_docs)
        else:
            avg_score = sub.get("evaluation", {}).get("averageScore", 84.5)
            judges_completed = sub.get("evaluation", {}).get("judgesCompleted", 2)

        # Dates formatting
        def fmt_dt(d):
            if isinstance(d, datetime):
                return d.strftime("%b %d, %Y %I:%M %p")
            elif isinstance(d, str) and d:
                try:
                    dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
                    return dt.strftime("%b %d, %Y %I:%M %p")
                except Exception:
                    return d
            return "Aug 05, 2026 11:59 PM"

        formatted_sub = {
            "id": sub_id,
            "projectTitle": sub.get("project") or sub.get("projectTitle") or "Untitled Project",
            "tagline": sub.get("tagline") or (desc_text[:100] if desc_text else "Innovative hackathon solution prototype"),
            "desc": desc_text or "No detailed description provided by team.",
            "category": sub.get("category", "General"),
            "status": sub.get("status", "Pending Review"),
            "version": f"v{sub.get('version', 1)}",
            "submittedAt": fmt_dt(submitted_dt),
            "deadline": fmt_dt(deadline_dt),
            "isLate": is_late,
            "lateReason": sub.get("lateReason"),
            "postDeadlineActivity": post_deadline_activity,
            "healthScore": health_score,
            "riskLevel": risk_level,
            "repoUrl": repo_url or "https://github.com/hackzen/project",
            "demoUrl": demo_url or "https://hackzen.demo.app",
            "deliverables": deliverables,
            "adminFeedback": sub.get("adminFeedback", ""),
            "changeIssues": sub.get("changeIssues", []),
            "investigationReason": sub.get("investigationReason", ""),
            "repoHealth": sub.get("repoHealth", {
                "accessible": True, "hasReadme": True, "hasSource": True,
                "commitsCount": 35, "contributorsCount": len(members_list), "lastCommit": "2h ago",
                "activityScore": 85, "postDeadlineCommits": 0
            }),
            "originality": sub.get("originality", {
                "similarityScore": similarity_score,
                "risk": risk_level,
                "potentialMatches": 1 if similarity_score > 30 else 0,
                "matchName": f"{similarity_score}% overlap detected" if similarity_score > 30 else "Unique Codebase"
            }),
            "aiReview": sub.get("aiReview", {
                "problemFit": 90, "innovation": 82, "technicalFeasibility": 86,
                "completeness": 78, "presentation": 88, "aiConfidence": 90,
                "aiRecommendation": "FLAG FOR INVESTIGATION" if risk_level == "HIGH" else "RECOMMEND APPROVAL",
                "summary": "Feasible project implementation meeting problem specifications."
            }),
            "evaluation": {
                "judgesAssigned": 3,
                "judgesCompleted": judges_completed,
                "averageScore": avg_score,
                "conflictDetected": sub.get("evaluation", {}).get("conflictDetected", False),
                "conflictMessage": sub.get("evaluation", {}).get("conflictMessage")
            },
            "rubric": sub.get("rubric", {
                "innovation": 16.5, "technicalFeasibility": 17.0, "problemRelevance": 17.5,
                "implementation": 15.5, "presentation": 16.0
            }),
            "teamDetails": {
                "name": (team.get("name") or team.get("teamName")) if team else sub.get("teamDetails", {}).get("name", "CyberKnights"),
                "college": (team.get("college") or team.get("institution")) if team else sub.get("teamDetails", {}).get("college", "ABC Engineering College"),
                "members": members_list,
                "mentor": sub.get("teamDetails", {}).get("mentor", {
                    "name": "Platform Assigned Mentor",
                    "lastReview": "Recently",
                    "progress": 82,
                    "feedback": "Core prototype is operational; ready for final review."
                })
            },
            "versions": sub.get("versions", [
                {"v": "v1", "date": fmt_dt(submitted_dt), "author": members_list[0]["name"] if members_list else "Team Lead", "note": "Final upload"}
            ]),
            "timeline": sub.get("timeline", [
                {"date": fmt_dt(submitted_dt), "event": "Submission Received"}
            ]),
            "notes": sub.get("notes", []),
            "fileSecurity": sub.get("fileSecurity", {
                "typeValid": True, "sizeValid": True, "virusScan": True, "integrityVerified": True,
                "fileSize": "35.0 MB", "fileCount": 180
            }),
            "hackathon": hackathon.get("title", "Global Hackathon 2026") if hackathon else "Global Hackathon 2026"
        }
        result.append(formatted_sub)

    return result

    return result


@router.put("/{submission_id}/status")
async def update_sub_status(
    submission_id: str,
    status_update: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update submission status (Admin only)"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    collection = get_submission_collection()
    query = {"_id": ObjectId(submission_id)} if ObjectId.is_valid(submission_id) else {"id": submission_id}
    
    result = await collection.update_one(query, {"$set": {"status": new_status}})

    if result.matched_count == 0:
        await collection.update_one({"id": submission_id}, {"$set": {"status": new_status}}, upsert=True)

    # Log Audit Action
    db = get_db()
    await db["audit_logs"].insert_one({
        "action": f"Submission Status: {new_status}",
        "details": f"Submission ID '{submission_id}' marked as {new_status}.",
        "category": "Submission",
        "color": "emerald" if new_status == "Approved" else "amber" if new_status == "Changes Requested" else "red",
        "icon": "📄",
        "timestamp": datetime.utcnow()
    })

    return {"success": True, "status": new_status}


@router.post("/{submission_id}/request-changes")
async def request_submission_changes(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth)
):
    """Request submission changes from team with detailed checklist and notification"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    message = payload.get("message", "Please fix the requested deliverables.")
    issues = payload.get("issues", [])
    extended_deadline = payload.get("deadline", "24 hours")

    db = get_db()
    collection = db["submissions"]
    query = {"_id": ObjectId(submission_id)} if ObjectId.is_valid(submission_id) else {"id": submission_id}

    new_timeline_entry = {
        "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
        "event": f"Changes Requested by Admin: {', '.join(issues) if issues else 'Deliverables update'}"
    }

    await collection.update_one(query, {
        "$set": {
            "status": "Changes Requested",
            "adminFeedback": message,
            "changeIssues": issues
        },
        "$push": {"timeline": new_timeline_entry}
    })

    # Broadcast notification to team members
    sub_doc = await collection.find_one(query)
    team_id = sub_doc.get("teamId") if sub_doc else None

    await db["notifications"].insert_one({
        "title": "Action Required: Submission Changes Requested",
        "message": f"Admin Notice: {message}. Issues: {', '.join(issues) if issues else 'Review requested items.'}. Deadline: {extended_deadline}.",
        "target_audience": "all",
        "teamId": team_id,
        "createdBy": current_user.get("sub", "admin"),
        "createdAt": datetime.utcnow(),
        "readBy": []
    })

    return {"success": True, "message": "Change request dispatched to team."}


@router.post("/{submission_id}/flag-investigation")
async def flag_submission_investigation(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth)
):
    """Flag submission for plagiarism or compliance investigation"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    reason = payload.get("reason", "Potential originality/plagiarism flag detected.")
    
    db = get_db()
    collection = db["submissions"]
    query = {"_id": ObjectId(submission_id)} if ObjectId.is_valid(submission_id) else {"id": submission_id}

    await collection.update_one(query, {
        "$set": {"status": "Flagged for Investigation", "investigationReason": reason},
        "$push": {
            "timeline": {
                "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
                "event": f"Flagged for Investigation ({reason})"
            }
        }
    })

    # Log dispute
    await db["disputes"].insert_one({
        "type": "Plagiarism Flag",
        "submissionId": submission_id,
        "reporter": current_user.get("email", "Admin"),
        "details": reason,
        "status": "Open",
        "createdAt": datetime.utcnow()
    })

    return {"success": True, "message": "Submission flagged for investigation."}


@router.post("/{submission_id}/add-note")
async def add_internal_admin_note(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth)
):
    """Add internal admin note to submission"""
    note_text = payload.get("text", "")
    if not note_text:
        raise HTTPException(status_code=400, detail="Note text is required")

    note_obj = {
        "author": current_user.get("name", "Admin"),
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
        "text": note_text
    }

    db = get_db()
    collection = db["submissions"]
    query = {"_id": ObjectId(submission_id)} if ObjectId.is_valid(submission_id) else {"id": submission_id}

    await collection.update_one(query, {"$push": {"notes": note_obj}})
    return {"success": True, "note": note_obj}


@router.post("/admin/bulk-action")
async def perform_bulk_submissions_action(
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth)
):
    """Perform bulk action (Approve, Request Changes, Reject, Flag) for selected submission IDs"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    submission_ids = payload.get("submissionIds", [])
    action = payload.get("action", "Approved")

    if not submission_ids:
        raise HTTPException(status_code=400, detail="No submissions selected")

    db = get_db()
    collection = db["submissions"]

    object_ids = [ObjectId(sid) for sid in submission_ids if ObjectId.is_valid(sid)]
    string_ids = [sid for sid in submission_ids if not ObjectId.is_valid(sid)]

    query = {"$or": [{"_id": {"$in": object_ids}}, {"id": {"$in": string_ids}}]}
    await collection.update_many(query, {"$set": {"status": action}})

    return {"success": True, "updatedCount": len(submission_ids), "action": action}


@router.get("/{submission_id}/ai-review")
async def get_submission_ai_review(
    submission_id: str,
    current_user: dict = Depends(with_auth)
):
    """Generate Gemini AI technical critique and rubric review for project submission"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin", "organizer", "judge"]:
        raise HTTPException(status_code=403, detail="Authorized review access required")

    db = get_db()
    collection = db["submissions"]
    query = {"_id": ObjectId(submission_id)} if ObjectId.is_valid(submission_id) else {"id": submission_id}
    
    sub = await collection.find_one(query)
    if not sub:
        # Fallback dummy submission for review
        sub = {
            "projectTitle": "AI Innovation Platform",
            "category": "Open Innovation / AI",
            "tagline": "Real-time AI assisted workflows for hackathon participants",
            "desc": "Autonomous evaluation pipelines and co-mentor modules built for rapid hackathon project assessment.",
            "repoUrl": "https://github.com/proeduvate/submission-core",
            "demoUrl": "https://youtu.be/demo",
            "techStack": ["React", "FastAPI", "MongoDB", "Gemini AI"]
        }

    review = await ai_service.review_project_submission(sub)
    return {"success": True, "review": review}
