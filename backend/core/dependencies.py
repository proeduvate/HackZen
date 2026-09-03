from fastapi import Depends, Security, HTTPException, status
from typing import List, Dict, Any
from core.security import get_current_user
from services.userService import UserService


from datetime import datetime

async def with_auth(
    current_user_payload: Dict[str, Any] = Security(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user_payload.get("id") or current_user_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    # Check if session has been revoked by admin
    session_id = current_user_payload.get("sessionId")
    if session_id:
        from database import get_db
        db = get_db()
        revoked_sess = await db["admin_sessions"].find_one({"sessionId": session_id, "revoked": True})
        if revoked_sess:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This administrator session has been revoked. Please sign in again."
            )
        # Update lastActive timestamp
        await db["admin_sessions"].update_one(
            {"sessionId": session_id},
            {"$set": {"lastActive": datetime.utcnow()}}
        )

    user = await UserService.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # Ensure backward compatibility with code expecting 'sub'
    user["sub"] = str(user["_id"])
    return user


class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    async def __call__(self, user: Dict[str, Any] = Security(get_current_user)):
        user_role = str(user.get("role", "")).lower()
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )

        session_id = user.get("sessionId")
        if session_id:
            from database import get_db
            db = get_db()
            revoked_sess = await db["admin_sessions"].find_one({"sessionId": session_id, "revoked": True})
            if revoked_sess:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This administrator session has been revoked. Please sign in again."
                )

        return user
