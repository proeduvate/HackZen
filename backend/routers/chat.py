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


@router.websocket("/ws/{team_id}/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, team_id: str, user_id: str):
    """WebSocket endpoint for real-time team chat"""
    await manager.connect(websocket, team_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming message
            chat_collection = get_db()["chats"]
            msg_data = {
                "teamId": team_id,
                "senderId": user_id,
                "content": data.get("content", ""),
                "messageType": data.get("type", "text"),
                "createdAt": datetime.utcnow(),
            }
            await chat_collection.insert_one(msg_data)

            # Broadcast
            broadcast_msg = {
                "type": "new_message",
                "message": {**msg_data, "createdAt": msg_data["createdAt"].isoformat()},
            }
            await manager.broadcast_to_team(broadcast_msg, team_id, user_id)
    except WebSocketDisconnect:
        manager.disconnect(team_id, user_id)


@router.get("/{team_id}/messages", response_model=List[ChatMessageResponse])
async def get_team_messages(
    team_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(with_auth),
):
    """Get chat messages for a team"""
    collection = get_db()["chats"]
    cursor = collection.find({"teamId": team_id}).sort("createdAt", -1).limit(limit)
    messages = await cursor.to_list(limit)

    # Reverse to get chronological order
    messages.reverse()

    for m in messages:
        m["_id"] = str(m["_id"])

    return [ChatMessageResponse(**m) for m in messages]
