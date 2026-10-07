from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    WebSocket,
    WebSocketDisconnect,
    Query,
    UploadFile,
    File,
    Response,
)
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
import json
import os
import uuid

from core.dependencies import with_auth
from core.security import verify_token, sanitize_input
from database import get_db
from schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatMessageSend, TeamFileResponse, MessageType
from services.file_upload import file_upload_service

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
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass


manager = ConnectionManager()


async def _can_access_team(db, team_id: str, user_id: str, role: str = ""):
    """Only team members, the approved mentor, and admins can read or write team records."""
    team = await db["teams"].find_one({"_id": ObjectId(team_id)}) if ObjectId.is_valid(team_id) else None
    if not team:
        # Fallback query if stored as string ID
        team = await db["teams"].find_one({"_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if role == "admin" or str(team.get("mentorId", "")) == str(user_id):
        return team
    membership = await db["teamMembers"].find_one({"teamId": str(team.get("_id", team_id)), "userId": str(user_id)})
    if not membership:
        membership = await db["teamMembers"].find_one({"teamId": team_id, "userId": str(user_id)})
    if not membership:
        raise HTTPException(status_code=403, detail="You do not have access to this team workspace")
    return team


def _user_id(user: dict) -> str:
    return str(user.get("id") or user.get("sub") or user.get("_id"))


# Legacy / Student portal send endpoint
@router.post("/{team_id}/send", response_model=ChatMessageResponse)
async def send_team_message_student(
    team_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Persist a team chat message for the student workspace."""
    content = sanitize_input(str(payload.get("content", "") or "")).strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat message content cannot be empty.",
        )

    db = get_db()
    sender_id = _user_id(current_user)
    await _can_access_team(db, team_id, sender_id, current_user.get("role", ""))

    sender_name = current_user.get("name") or current_user.get("fullName") or current_user.get("email") or "Team member"
    message_type = payload.get("type") or payload.get("messageType") or "text"

    chat_collection = db["chats"]
    msg_data = {
        "teamId": team_id,
        "senderId": sender_id,
        "senderName": sender_name,
        "content": content,
        "messageType": message_type,
        "isCheckpoint": bool(payload.get("isCheckpoint", False)),
        "createdAt": datetime.utcnow(),
    }
    result = await chat_collection.insert_one(msg_data)
    msg_data["_id"] = str(result.inserted_id)

    await manager.broadcast_to_team(
        {"type": "new_message", "message": {**msg_data, "createdAt": msg_data["createdAt"].isoformat()}},
        team_id,
        sender_id,
    )

    return ChatMessageResponse(**msg_data)


# Mentor / Modern message send endpoint
@router.post("/{team_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_team_message(team_id: str, payload: ChatMessageSend, current_user: dict = Depends(with_auth)):
    db = get_db()
    sender_id = _user_id(current_user)
    await _can_access_team(db, team_id, sender_id, current_user.get("role", ""))
    content = sanitize_input(payload.content)
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    message = {
        "teamId": team_id,
        "senderId": sender_id,
        "senderName": current_user.get("name") or current_user.get("fullName") or "Team member",
        "content": content,
        "messageType": payload.messageType.value,
        "isCheckpoint": False,
        "createdAt": datetime.utcnow(),
    }
    result = await db["chats"].insert_one(message)
    message["_id"] = str(result.inserted_id)
    await manager.broadcast_to_team(
        {"type": "new_message", "message": {**message, "createdAt": message["createdAt"].isoformat()}},
        team_id,
        sender_id,
    )
    return ChatMessageResponse(**message)


@router.websocket("/ws/{team_id}/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, team_id: str, user_id: str):
    """WebSocket endpoint for real-time team chat"""
    token = websocket.query_params.get("token")
    if token:
        try:
            claims = verify_token(token, "access")
            resolved_uid = str(claims.get("sub") or claims.get("id") or user_id)
            await _can_access_team(get_db(), team_id, resolved_uid, claims.get("role", ""))
            user_id = resolved_uid
        except Exception:
            await websocket.close(code=1008, reason="Unauthorized")
            return
    await manager.connect(websocket, team_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            content = sanitize_input(str(data.get("content", "")))
            if not content or len(content) > 5000:
                await websocket.send_json({"type": "error", "message": "Messages must be between 1 and 5000 characters."})
                continue
            db = get_db()
            chat_collection = db["chats"]
            sender = await db["users"].find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
            msg_data = {
                "teamId": team_id,
                "senderId": user_id,
                "senderName": (sender or {}).get("name") or data.get("senderName") or "Team member",
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
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))
    collection = db["chats"]
    cursor = collection.find({"teamId": team_id}).sort("createdAt", -1).limit(limit)
    messages = await cursor.to_list(limit)

    messages.reverse()

    for m in messages:
        m["_id"] = str(m["_id"])

    return [ChatMessageResponse(**m) for m in messages]


@router.post("/{team_id}/files", response_model=TeamFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_team_file(team_id: str, file: UploadFile = File(...), current_user: dict = Depends(with_auth)):
    db = get_db()
    uploader_id = _user_id(current_user)
    await _can_access_team(db, team_id, uploader_id, current_user.get("role", ""))
    allowed_mime_types = {
        ".jpg": {"image/jpeg"}, ".jpeg": {"image/jpeg"}, ".png": {"image/png"}, ".webp": {"image/webp"},
        ".mp4": {"video/mp4"}, ".mov": {"video/quicktime"}, ".webm": {"video/webm"},
        ".pdf": {"application/pdf"}, ".doc": {"application/msword"},
        ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
        ".ppt": {"application/vnd.ms-powerpoint"}, ".pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
        ".xls": {"application/vnd.ms-excel"}, ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    }
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in allowed_mime_types:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Files must be 20 MB or smaller")
    detected_type = file.content_type or "application/octet-stream"
    if detected_type != "application/octet-stream" and detected_type not in allowed_mime_types[extension]:
        raise HTTPException(status_code=400, detail="File MIME type does not match its extension")
    target = file_upload_service.base_dir / "team-files" / team_id
    target.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    with open(target / stored_name, "wb") as output:
        output.write(content)
    safe_name = os.path.basename(file.filename or stored_name).replace("\x00", "")
    attachment_type = "image" if extension in {".jpg", ".jpeg", ".png", ".webp"} else "video" if extension in {".mp4", ".mov", ".webm"} else "file"
    record = {
        "teamId": team_id,
        "name": safe_name,
        "path": f"team-files/{team_id}/{stored_name}",
        "url": "",
        "size": len(content),
        "contentType": detected_type,
        "attachmentType": attachment_type,
        "uploadedBy": uploader_id,
        "uploadedByName": current_user.get("name") or "Team member",
        "createdAt": datetime.utcnow(),
    }
    result = await db["teamFiles"].insert_one(record)
    record["_id"] = str(result.inserted_id)
    record["url"] = f"/chat/{team_id}/files/{record['_id']}/download"
    await db["teamFiles"].update_one({"_id": result.inserted_id}, {"$set": {"url": record["url"]}})
    chat_message = {
        "teamId": team_id,
        "senderId": uploader_id,
        "senderName": record["uploadedByName"],
        "content": f"Shared file: {record['name']}",
        "messageType": MessageType.FILE.value,
        "isCheckpoint": False,
        "fileId": record["_id"],
        "attachmentName": record["name"],
        "attachmentUrl": record["url"],
        "attachmentType": attachment_type,
        "attachmentSize": record["size"],
        "createdAt": record["createdAt"],
    }
    chat_result = await db["chats"].insert_one(chat_message)
    chat_message["_id"] = str(chat_result.inserted_id)
    await manager.broadcast_to_team(
        {"type": "new_message", "message": {**chat_message, "createdAt": chat_message["createdAt"].isoformat()}},
        team_id,
        uploader_id,
    )
    return TeamFileResponse(**record)


@router.get("/{team_id}/files", response_model=List[TeamFileResponse])
async def get_team_files(team_id: str, current_user: dict = Depends(with_auth)):
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))
    files = await db["teamFiles"].find({"teamId": team_id}).sort("createdAt", -1).to_list(100)
    for record in files:
        record["_id"] = str(record["_id"])
    return [TeamFileResponse(**record) for record in files]


@router.get("/{team_id}/media", response_model=List[TeamFileResponse])
async def get_team_media(team_id: str, current_user: dict = Depends(with_auth)):
    """List protected image and video attachments for the team info panel."""
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))
    files = await db["teamFiles"].find({"teamId": team_id, "attachmentType": {"$in": ["image", "video"]}}).sort("createdAt", -1).to_list(100)
    for record in files:
        record["_id"] = str(record["_id"])
    return [TeamFileResponse(**record) for record in files]


@router.get("/{team_id}/files/{file_id}/download")
async def download_team_file(team_id: str, file_id: str, current_user: dict = Depends(with_auth)):
    """Authenticated download: files are never exposed through an unauthenticated URL."""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))
    record = await db["teamFiles"].find_one({"_id": ObjectId(file_id), "teamId": team_id})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    path = (file_upload_service.base_dir / record["path"]).resolve()
    if not path.is_file() or file_upload_service.base_dir.resolve() not in path.parents:
        raise HTTPException(status_code=404, detail="Stored file not found")
    return Response(
        content=path.read_bytes(),
        media_type=record.get("contentType") or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{record["name"]}"'},
    )
