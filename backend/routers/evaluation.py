from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.evaluation import EvaluationCreate, EvaluationResponse
from models.evaluation import EvaluationInDB

router = APIRouter()


def get_evaluation_collection():
    return get_db()["evaluations"]


DEFAULT_CRITERIA = [
    {"id": "innovation", "label": "Innovation & Originality", "description": "Is the idea unique and novel?", "weight": 10, "minScore": 0, "maxScore": 10},
    {"id": "technical", "label": "Technical Implementation", "description": "Code quality and complexity.", "weight": 10, "minScore": 0, "maxScore": 10},
    {"id": "design", "label": "Design & User Experience", "description": "UI/UX and ease of use.", "weight": 10, "minScore": 0, "maxScore": 10},
    {"id": "presentation", "label": "Presentation Quality", "description": "Clarity of the pitch/demo.", "weight": 10, "minScore": 0, "maxScore": 10},
    {"id": "feasibility", "label": "Business Feasibility", "description": "Market potential and viability.", "weight": 10, "minScore": 0, "maxScore": 10},
]


@router.get("/criteria")
async def get_evaluation_criteria(current_user: dict = Depends(with_auth)):
    """Get evaluation criteria saved by this organizer (defaults if never saved)."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    doc = await db["evaluationCriteria"].find_one({"organizerId": user_id})
    if not doc:
        return DEFAULT_CRITERIA
    return doc.get("criteria", DEFAULT_CRITERIA)


@router.put("/criteria")
async def save_evaluation_criteria(
    criteria: List[Dict[str, Any]] = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Upsert evaluation criteria for the current organizer."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    if not isinstance(criteria, list):
        raise HTTPException(status_code=400, detail="Criteria must be a list")

    await db["evaluationCriteria"].update_one(
        {"organizerId": user_id},
        {
            "$set": {
                "organizerId": user_id,
                "criteria": criteria,
                "updatedAt": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    return criteria


@router.post(
    "/", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED
)
async def create_evaluation(
    eval_data: EvaluationCreate,
    current_user: dict = Depends(RequireRole(["mentor", "admin", "organizer"])),
):
    """Evaluate a project submission (Judges/Mentors/Admins only)"""

    collection = get_evaluation_collection()
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token",
        )

    eval_dict = eval_data.model_dump(by_alias=True)
    eval_dict["judgeId"] = user_id
    eval_dict["evaluatedAt"] = datetime.utcnow()

    # Calculate total score if logic exists, otherwise use provided
    if not eval_dict.get("totalScore") and eval_data.scores:
        eval_dict["totalScore"] = sum(eval_data.scores.values())

    result = await collection.insert_one(eval_dict)
    eval_dict["_id"] = str(result.inserted_id)

    return EvaluationResponse(**eval_dict)


@router.get("/submission/{submission_id}", response_model=List[EvaluationResponse])
async def get_submission_evaluations(submission_id: str):
    """Get all evaluations for a submission"""
    collection = get_evaluation_collection()
    cursor = collection.find({"submissionId": submission_id})
    evals = await cursor.to_list(length=100)

    for ev in evals:
        ev["_id"] = str(ev["_id"])

    return [EvaluationResponse(**ev) for ev in evals]


@router.get("/leaderboard/{hackathon_id}", response_model=List[Dict[str, Any]])
async def get_leaderboard(hackathon_id: str):
    """Calculate and return leaderboard for a specific hackathon"""
    db = get_db()
    eval_collection = db["evaluations"]
    teams_collection = db["teams"]

    # Simple aggregation: Average score per team
    pipeline = [
        {"$match": {"hackathonId": hackathon_id}},
        {
            "$group": {
                "_id": "$submissionId",
                "averageScore": {"$avg": "$totalScore"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"averageScore": -1}},
    ]

    results = await eval_collection.aggregate(pipeline).to_list(100)

    leaderboard = []
    for i, res in enumerate(results):
        # Find submission to get teamId
        sub = await db["submissions"].find_one({"_id": ObjectId(res["_id"])})
        if not sub:
            continue

        team = await teams_collection.find_one({"_id": ObjectId(sub["teamId"])})
        if not team:
            continue

        leaderboard.append(
            {
                "rank": i + 1,
                "teamId": sub["teamId"],
                "teamName": team["teamName"],
                "score": round(res["averageScore"], 2),
                "maxScore": 100,  # Assuming 100 for now
                "submissionId": res["_id"],
            }
        )

    return leaderboard
