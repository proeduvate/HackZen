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

@router.post("/", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    eval_data: EvaluationCreate,
    current_user: dict = Depends(RequireRole(["mentor", "admin", "organizer"]))
):
    """Evaluate a project submission (Judges/Mentors/Admins only)"""
    
    collection = get_evaluation_collection()
    
    eval_dict = eval_data.model_dump(by_alias=True)
    eval_dict["judgeId"] = current_user["sub"]
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
        {"$group": {
            "_id": "$submissionId",
            "averageScore": {"$avg": "$totalScore"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"averageScore": -1}}
    ]
    
    results = await eval_collection.aggregate(pipeline).to_list(100)
    
    leaderboard = []
    for i, res in enumerate(results):
        # Find submission to get teamId
        sub = await db["submissions"].find_one({"_id": ObjectId(res["_id"])})
        if not sub: continue
        
        team = await teams_collection.find_one({"_id": ObjectId(sub["teamId"])})
        if not team: continue
        
        leaderboard.append({
            "rank": i + 1,
            "teamId": sub["teamId"],
            "teamName": team["teamName"],
            "score": round(res["averageScore"], 2),
            "maxScore": 100, # Assuming 100 for now
            "submissionId": res["_id"]
        })
        
    return leaderboard
