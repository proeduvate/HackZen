from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    WebSocket,
    WebSocketDisconnect,
    Query,
)
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
import json

from core.dependencies import with_auth
from core.security import verify_token
from database import get_db
from schemas.chat import ChatMessageCreate, ChatMessageResponse, MessageType

router = APIRouter()


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, team_id: str, user_id: str):
        await websocket.accept()
        if team_id not in self.active_connections:
            self.active_connections[team_id] = {}
        self.active_connections[team_id][user_id] = websocket

    def disconnect(self, team_id: str, user_id: str):
        if (
            team_id in self.active_connections
            and user_id in self.active_connections[team_id]
        ):
            del self.active_connections[team_id][user_id]
            if not self.active_connections[team_id]:
                del self.active_connections[team_id]

    async def broadcast_to_team(
        self, message: dict, team_id: str, sender_id: str = None
    ):
        if team_id in self.active_connections:
            for user_id, connection in self.active_connections[team_id].items():
                if user_id != sender_id:
                    await connection.send_json(message)


manager = ConnectionManager()


@router.post("/{team_id}/send", response_model=ChatMessageResponse)
async def send_team_message(
    team_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Persist a team chat message for the authenticated student and return it."""
    content = str(payload.get("content", "") or "").strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat message content cannot be empty.",
        )

    sender_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("_id"))
    sender_name = current_user.get("name") or current_user.get("email") or "Team member"
    message_type = payload.get("type") or payload.get("messageType") or "text"

    db = get_db()
    team_membership = await db["teamMembers"].find_one({"teamId": team_id, "userId": sender_id})
    if not team_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team.",
        )

    chat_collection = db["chats"]
    msg_data = {
        "teamId": team_id,
        "senderId": sender_id,
        "senderName": sender_name,
        "content": content,
        "messageType": message_type,
        "isCheckpoint": False,
        "createdAt": datetime.utcnow(),
    }
    result = await chat_collection.insert_one(msg_data)
    msg_data["_id"] = str(result.inserted_id)

    return ChatMessageResponse(**msg_data)


@router.websocket("/ws/{team_id}/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, team_id: str, user_id: str):
    """WebSocket endpoint for live team chat updates using the authenticated user identity."""
    token = websocket.query_params.get("token")
    if token:
        try:
            token_payload = verify_token(token, "access")
            user_id = str(token_payload.get("sub") or token_payload.get("id") or user_id)
        except HTTPException:
            await websocket.close(code=1008, reason="Invalid authentication token")
            return

    await manager.connect(websocket, team_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            chat_collection = get_db()["chats"]
            content = str(data.get("content", "") or "").strip()
            if not content:
                continue

            sender_id = user_id
            sender_name = data.get("senderName") or data.get("userName") or "Team member"
            msg_data = {
                "teamId": team_id,
                "senderId": sender_id,
                "senderName": sender_name,
                "content": content,
                "messageType": data.get("type", data.get("messageType", "text")),
                "isCheckpoint": bool(data.get("isCheckpoint", False)),
                "createdAt": datetime.utcnow(),
            }
            result = await chat_collection.insert_one(msg_data)
            msg_data["_id"] = str(result.inserted_id)

            broadcast_msg = {
                "type": "new_message",
                "message": {**msg_data, "createdAt": msg_data["createdAt"].isoformat()},
            }
            await manager.broadcast_to_team(broadcast_msg, team_id, sender_id)
    except WebSocketDisconnect:
        manager.disconnect(team_id, user_id)


@router.get("/{team_id}/messages", response_model=List[ChatMessageResponse])
async def get_team_messages(
    team_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(with_auth),
):
    """Get chat messages for a team"""
    sender_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("_id"))
    is_member = await get_db()["teamMembers"].find_one({"teamId": team_id, "userId": sender_id})
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team.",
        )

    collection = get_db()["chats"]
    cursor = collection.find({"teamId": team_id}).sort("createdAt", -1).limit(limit)
    messages = await cursor.to_list(limit)

    messages.reverse()

    for m in messages:
        m["_id"] = str(m["_id"])

    return [ChatMessageResponse(**m) for m in messages]
