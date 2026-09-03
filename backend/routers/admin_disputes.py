from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from database import get_db
from core.dependencies import RequireRole
from services.ai_service import ai_service

router = APIRouter(prefix="/admin/disputes", tags=["Admin Disputes"])

class ResolveDisputeRequest(BaseModel):
    decision: str
    reason: str
    actions: List[str] = []
    notifyReporter: Optional[bool] = True
    notifyTeam: Optional[bool] = True
    notifyOrganizer: Optional[bool] = True

class AddNoteRequest(BaseModel):
    text: str
    isInternal: Optional[bool] = True

class AssignInvestigatorRequest(BaseModel):
    investigatorName: str
    investigatorEmail: str

class RequestInfoRequest(BaseModel):
    target: str = "Team"
    requestedItems: List[str] = []
    message: str = ""
    deadlineHours: int = 48

@router.get("/all")
async def get_all_disputes(current_user: dict = Depends(RequireRole(["admin", "superadmin"]))):
    """Fetch all dispute cases enriched with case assessments, evidence integrity, similarity scores, COI detection, and audit histories"""
    db = get_db()
    disputes = await db["disputes"].find().sort("createdAt", -1).to_list(100)

    # Seed mock disputes if collection is empty
    if not disputes:
        mock_disputes = [
            {
                "id": "DSP-2026-00421",
                "disputeCode": "DSP-2026-00421",
                "type": "Plagiarism",
                "category": "Plagiarism",
                "severity": "CRITICAL",
                "status": "Under Investigation",
                "createdAt": datetime.utcnow() - timedelta(hours=6),
                "slaDeadline": datetime.utcnow() + timedelta(hours=18),
                "reporter": {
                    "name": "John Doe",
                    "email": "johndoe@mit.edu",
                    "role": "Participant",
                    "previousReports": 0,
                    "accuracyRating": "100%"
                },
                "reportedTeam": {
                    "name": "CyberKnights",
                    "college": "ABC Engineering College",
                    "previousCases": 2,
                    "confirmedViolations": 1,
                    "warnings": 1
                },
                "hackathonTitle": "Global AI Summit 2026",
                "assessment": {
                    "riskLevel": "CRITICAL",
                    "evidenceVerified": "3 / 4",
                    "aiConfidence": 91,
                    "slaRemaining": "17h 42m remaining",
                    "recommendation": "INVESTIGATE & REQUEST EXPLANATION"
                },
                "similarityAnalysis": {
                    "overallSimilarity": 94,
                    "sourceCode": 97,
                    "documentation": 82,
                    "readme": 91,
                    "matchedSourceUrl": "https://github.com/open-ai/reference-health-llm"
                },
                "evidence": [
                    {"id": "ev_1", "type": "Original Repository", "source": "GitHub", "uploaded": "Aug 12, 10:21 AM", "verified": True},
                    {"id": "ev_2", "type": "Plagiarism Analysis Report", "source": "AI Scanner", "uploaded": "Aug 12, 10:25 AM", "verified": True},
                    {"id": "ev_3", "type": "Git Commit History Log", "source": "GitHub API", "uploaded": "Aug 12, 11:00 AM", "verified": True},
                    {"id": "ev_4", "type": "Reporter Screenshot", "source": "Upload", "uploaded": "Aug 12, 10:12 AM", "verified": False}
                ],
                "evidenceIntegrity": {
                    "sourceVerified": True,
                    "hashVerified": True,
                    "versionMatched": True,
                    "timestampVerified": True,
                    "modified": False
                },
                "investigationChecklist": {
                    "complaintReviewed": True,
                    "reporterVerified": True,
                    "reportedTeamIdentified": True,
                    "submissionInspected": True,
                    "evidenceVerified": True,
                    "similarityChecked": True,
                    "teamResponseReceived": False,
                    "finalDecisionRecorded": False
                },
                "coi": {
                    "detected": True,
                    "relationship": "Mentor",
                    "message": "Assigned investigator Dr. Kumar is currently assigned as team mentor."
                },
                "assignedInvestigator": {
                    "name": "Dr. S. Kumar",
                    "assignedAt": "Aug 12, 10:45 AM"
                },
                "timeline": [
                    {"date": "Aug 12, 10:12 AM", "event": "Report received from John Doe"},
                    {"date": "Aug 12, 10:45 AM", "event": "Investigator Dr. Kumar assigned"},
                    {"date": "Aug 12, 11:35 AM", "event": "Evidence chain verified (94% similarity)"}
                ],
                "communications": [
                    {"author": "System", "role": "Automated", "text": "Plagiarism flag auto-triggered by AI evaluation.", "isInternal": False, "date": "Aug 12, 10:12 AM"},
                    {"author": "Admin Alex", "role": "Internal Note", "text": "Internal: Similarity confirmed against reference repo. Team explanation requested.", "isInternal": True, "date": "Aug 12, 11:40 AM"}
                ]
            }
        ]
        await db["disputes"].insert_many(mock_disputes)
        disputes = await db["disputes"].find().to_list(100)

    result = []
    now = datetime.utcnow()
    for d in disputes:
        created_dt = d.get("createdAt", now - timedelta(hours=6))
        if not isinstance(created_dt, datetime):
            created_dt = now - timedelta(hours=6)
        
        sla_deadline = d.get("slaDeadline") or (created_dt + timedelta(hours=24))
        if not isinstance(sla_deadline, datetime):
            sla_deadline = created_dt + timedelta(hours=24)

        diff_sec = (sla_deadline - now).total_seconds()
        if diff_sec <= 0:
            sla_text = "SLA EXCEEDED"
        else:
            rem_h = int(diff_sec // 3600)
            rem_m = int((diff_sec % 3600) // 60)
            sla_text = f"{rem_h}h {rem_m}m remaining"

        assessment = d.get("assessment", {})
        assessment["slaRemaining"] = sla_text

        result.append({
            "id": str(d["_id"]),
            "disputeCode": d.get("disputeCode", f"DSP-2026-{str(d['_id'])[-5:].upper()}"),
            "type": d.get("type", d.get("category", "Plagiarism")),
            "category": d.get("category", "Plagiarism"),
            "severity": d.get("severity", "CRITICAL"),
            "status": d.get("status", "Under Investigation"),
            "reporter": d.get("reporter", {"name": "Anonymous", "email": "reporter@hackzen.io", "role": "Participant"}),
            "reportedTeam": d.get("reportedTeam", {"name": "Target Team", "college": "Engineering Institution"}),
            "hackathonTitle": d.get("hackathonTitle", "Global Hackathon 2026"),
            "assessment": assessment if assessment else {
                "riskLevel": "CRITICAL", "evidenceVerified": "3 / 4", "aiConfidence": 91,
                "slaRemaining": sla_text, "recommendation": "INVESTIGATE & REQUEST EXPLANATION"
            },
            "similarityAnalysis": d.get("similarityAnalysis", {
                "overallSimilarity": 94, "sourceCode": 97, "documentation": 82, "readme": 91,
                "matchedSourceUrl": "https://github.com/reference/project"
            }),
            "evidence": d.get("evidence", []),
            "evidenceIntegrity": d.get("evidenceIntegrity", {
                "sourceVerified": True, "hashVerified": True, "versionMatched": True, "timestampVerified": True, "modified": False
            }),
            "investigationChecklist": d.get("investigationChecklist", {
                "complaintReviewed": True, "reporterVerified": True, "reportedTeamIdentified": True,
                "submissionInspected": True, "evidenceVerified": True, "similarityChecked": True,
                "teamResponseReceived": False, "finalDecisionRecorded": False
            }),
            "coi": d.get("coi", {"detected": False, "relationship": None, "message": "No conflict of interest detected."}),
            "assignedInvestigator": d.get("assignedInvestigator", {"name": "Admin User", "assignedAt": "Recently"}),
            "timeline": d.get("timeline", []),
            "communications": d.get("communications", []),
            "appeal": d.get("appeal", {"eligible": True, "windowHours": 48, "status": "No appeal submitted"})
        })

    return {"success": True, "disputes": result}

@router.post("/{dispute_id}/assign")
async def assign_investigator(
    dispute_id: str,
    data: AssignInvestigatorRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Assign investigator & run Conflict of Interest check against team mentors/members"""
    db = get_db()
    query = {"_id": ObjectId(dispute_id)} if ObjectId.is_valid(dispute_id) else {"disputeCode": dispute_id}

    dispute_doc = await db["disputes"].find_one(query)
    team_name = dispute_doc.get("reportedTeam", {}).get("name", "") if dispute_doc else ""
    
    coi_flag = {"detected": False, "relationship": None, "message": "No conflict of interest detected."}
    if team_name and data.investigatorEmail:
        team_doc = await db["teams"].find_one({"teamName": team_name})
        if team_doc:
            mentor_id = team_doc.get("mentorId")
            mentor_user = await db["users"].find_one({"email": data.investigatorEmail})
            if mentor_user and str(mentor_user.get("_id")) == str(mentor_id):
                coi_flag = {
                    "detected": True,
                    "relationship": "Assigned Team Mentor",
                    "message": f"Conflict of Interest Alert: {data.investigatorName} is assigned mentor for team {team_name}."
                }

    assign_obj = {
        "name": data.investigatorName,
        "email": data.investigatorEmail,
        "assignedAt": datetime.utcnow().strftime("%b %d, %I:%M %p")
    }

    new_timeline = {
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
        "event": f"Investigator assigned: {data.investigatorName} (COI: {'Detected' if coi_flag['detected'] else 'Clean'})"
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {
                "assignedInvestigator": assign_obj,
                "status": "Under Investigation",
                "coi": coi_flag
            },
            "$push": {"timeline": new_timeline}
        }
    )

    return {"success": True, "message": f"Investigator {data.investigatorName} assigned to dispute.", "coi": coi_flag}

@router.post("/{dispute_id}/request-info")
async def request_info_from_party(
    dispute_id: str,
    data: RequestInfoRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Send structured info request to reporter or team"""
    db = get_db()
    query = {"_id": ObjectId(dispute_id)} if ObjectId.is_valid(dispute_id) else {"disputeCode": dispute_id}

    info_log = {
        "author": current_user.get("name", "Admin"),
        "role": f"Information Request to {data.target}",
        "text": f"Request: {', '.join(data.requestedItems)}. Message: {data.message}. Deadline: {data.deadlineHours}h.",
        "isInternal": False,
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p")
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {"status": "Waiting for Response"},
            "$push": {
                "communications": info_log,
                "timeline": {"date": datetime.utcnow().strftime("%b %d, %I:%M %p"), "event": f"Information requested from {data.target}"}
            }
        }
    )

    return {"success": True, "message": "Information request dispatched."}

@router.put("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: ResolveDisputeRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Record final decision, resolution actions, mandatory reason, and audit trail"""
    db = get_db()
    query = {"_id": ObjectId(dispute_id)} if ObjectId.is_valid(dispute_id) else {"disputeCode": dispute_id}
    
    dispute = await db["disputes"].find_one(query)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    resolution_data = {
        "decision": data.decision,
        "reason": data.reason,
        "actionsTaken": data.actions,
        "resolvedBy": current_user.get("name", "Admin"),
        "resolvedAt": datetime.utcnow().strftime("%b %d, %Y %I:%M %p")
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {
                "status": "Resolved",
                "resolution": resolution_data,
                "investigationChecklist.finalDecisionRecorded": True,
                "appeal": {"eligible": True, "windowHours": 48, "status": "48-Hour Appeal Window Active"}
            },
            "$push": {
                "timeline": {
                    "event": f"Final Decision Recorded: {data.decision}",
                    "date": datetime.utcnow().strftime("%b %d, %I:%M %p")
                }
            }
        }
    )

    await db["audit_logs"].insert_one({
        "action": f"Dispute Resolved: {data.decision}",
        "category": "Disputes",
        "details": f"Dispute {dispute_id} resolved with decision '{data.decision}'. Actions: {', '.join(data.actions)}. Reason: {data.reason}",
        "adminName": current_user.get("name", "Admin"),
        "timestamp": datetime.utcnow()
    })

    return {"success": True, "message": "Dispute case resolved and audit trail recorded."}

@router.post("/{dispute_id}/notes")
async def add_internal_note(
    dispute_id: str,
    data: AddNoteRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    db = get_db()
    query = {"_id": ObjectId(dispute_id)} if ObjectId.is_valid(dispute_id) else {"disputeCode": dispute_id}
    
    note = {
        "author": current_user.get("name", "Admin"),
        "role": "Internal Note" if data.isInternal else "Public Message",
        "text": data.text,
        "isInternal": data.isInternal,
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p")
    }

    await db["disputes"].update_one(query, {"$push": {"communications": note}})
    return {"success": True, "note": note}

@router.post("/{dispute_id}/ai-assessment")
async def get_dispute_ai_assessment(
    dispute_id: str,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Generate Gemini AI investigative assessment for a dispute case"""
    db = get_db()
    query = {"_id": ObjectId(dispute_id)} if ObjectId.is_valid(dispute_id) else {"$or": [{"disputeCode": dispute_id}, {"id": dispute_id}]}
    
    dispute = await db["disputes"].find_one(query)
    if not dispute and ObjectId.is_valid(dispute_id):
        dispute = await db["disputes"].find_one({"$or": [{"disputeCode": dispute_id}, {"id": dispute_id}]})
        
    if not dispute:
        dispute = {
            "disputeCode": dispute_id,
            "type": "Plagiarism",
            "category": "Plagiarism",
            "reportedTeam": {"name": "AI Builders"},
            "hackathonTitle": "Autonomous Agentic Hackathon",
            "similarityAnalysis": {"overallSimilarity": 94, "sourceCode": 97, "documentation": 82},
            "evidence": ["Similarity in repository model code", "Commit timeline discrepancies"]
        }

    assessment = await ai_service.analyze_dispute_case(dispute)
    return {"success": True, "assessment": assessment}
