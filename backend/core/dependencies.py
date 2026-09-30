from fastapi import Depends, Security, HTTPException, status
from typing import List, Dict, Any
from core.security import get_current_user
from services.userService import UserService
from database import get_db
from datetime import datetime


async def with_auth(
    current_user_payload: Dict[str, Any] = Security(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user_payload.get("id") or current_user_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    user = await UserService.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    #  Ensure  backward  compatibility  with  code  expecting  'sub'
    user["sub"] = str(user["_id"])
    # Presence is based on real authenticated activity.  Dashboard consumers
    # classify it as active/idle/offline; no status is randomly assigned.
    try:
        await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"lastActive": datetime.utcnow()}})
        user["lastActive"] = datetime.utcnow()
    except Exception:
        pass
    return user


class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: Dict[str, Any] = Security(get_current_user)):
        if user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return user
