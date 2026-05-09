from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from services.ai_service import ai_service
from schemas.ai_chatbot import AILogResponse

router = APIRouter()

def get_ai_logs_collection():
    return get_db()["aiLogs"]

@router.post("/chat")
async def chat_with_ai_co_mentor(
    query: str = Body(..., embed=True),
    hackathon_id: str = Body(..., embed=True),
    current_user: dict = Depends(with_auth)
):
    # Check if hackathon exists
    hackathons_collection = get_db()["hackathons"]
    hackathon = await hackathons_collection.find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        hackathon = await hackathons_collection.find_one({"hackathonId": hackathon_id})
        
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    
    # Generate AI response
    response_data = await ai_service.generate_response(query, [], hackathon_id)
    response_text = response_data.get("response", "I'm sorry, I couldn't generate a response.")
    
    # Store log as per finalized schema
    log_data = {
        "userId": str(current_user["_id"]),
        "hackathonId": hackathon_id,
        "query": query,
        "response": response_text,
        "timestamp": datetime.utcnow()
    }
    
    logs_collection = get_ai_logs_collection()
    await logs_collection.insert_one(log_data)
    
    return {
        "response": response_text,
        "timestamp": log_data["timestamp"].isoformat()
    }

@router.get("/logs", response_model=List[AILogResponse])
async def get_my_ai_logs(
    hackathon_id: Optional[str] = None,
    current_user: dict = Depends(with_auth)
):
    logs_collection = get_ai_logs_collection()
    query = {"userId": str(current_user["_id"])}
    if hackathon_id:
        query["hackathonId"] = hackathon_id
        
    cursor = logs_collection.find(query).sort("timestamp", -1)
    logs = await cursor.to_list(100)
    
    for log in logs:
        log["_id"] = str(log["_id"])
        
    return [AILogResponse(**log) for log in logs]
