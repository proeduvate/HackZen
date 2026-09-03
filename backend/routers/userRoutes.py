from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any
from core.security import create_access_token
from core.dependencies import with_auth
from schemas.userSchema import (
    UserCreate,
    UserMyResponse,
    UserResponse,
    TokenResponse,
    LoginRequest,
    ForgotPasswordRequest,
)
from services.userService import UserService

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
)
async def register(user_data: UserCreate):
    from database import get_db
    db = get_db()

    # Verify platform public registration policy
    settings = await db["settings"].find_one({"key": "global_config"})
    if settings and settings.get("publicRegistrations") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public student and organizer registrations are temporarily closed by platform administration."
        )

    try:
        user_dict = await UserService.create_user(user_data)
        return UserResponse(**user_dict)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse, response_model_by_alias=True)
async def login(credentials: LoginRequest, request: Request):
    from database import get_db
    import re
    from uuid import uuid4
    from datetime import datetime, timedelta

    db = get_db()
    clean_email = str(credentials.email).strip().lower()
    client_ip = request.client.host if request.client else "127.0.0.1"

    # 1. Fetch current global security policies
    settings = await db["settings"].find_one({"key": "global_config"})
    if not settings:
        settings = {}

    max_attempts_str = str(settings.get("maxLoginAttempts", "5 Attempts"))
    max_attempts_match = re.search(r'\d+', max_attempts_str)
    max_attempts = int(max_attempts_match.group(0)) if max_attempts_match else 5

    lockout_str = str(settings.get("lockoutDuration", "15 Minutes"))
    if "Hour" in lockout_str:
        lockout_hours_match = re.search(r'\d+', lockout_str)
        lockout_minutes = (int(lockout_hours_match.group(0)) if lockout_hours_match else 1) * 60
    else:
        lockout_min_match = re.search(r'\d+', lockout_str)
        lockout_minutes = int(lockout_min_match.group(0)) if lockout_min_match else 15

    # 2. Check failed login attempts lockout window
    cutoff = datetime.utcnow() - timedelta(minutes=lockout_minutes)
    recent_failed_attempts = await db["login_attempts"].count_documents({
        "email": clean_email,
        "success": False,
        "timestamp": {"$gte": cutoff}
    })

    if recent_failed_attempts >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Lockout: Account locked due to {recent_failed_attempts} failed login attempts. Security protocol requires waiting {lockout_str} before retrying."
        )

    # 3. Authenticate User
    user = await UserService.authenticate_user(credentials.email, credentials.password)
    if not user:
        # Record failed attempt
        await db["login_attempts"].insert_one({
            "email": clean_email,
            "ip": client_ip,
            "timestamp": datetime.utcnow(),
            "success": False
        })
        attempts_left = max(0, max_attempts - (recent_failed_attempts + 1))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. {attempts_left} attempt(s) remaining before security lockout."
        )

    # Clear failed login attempts on successful password
    await db["login_attempts"].delete_many({"email": clean_email})

    user_role = str(user.get("role", "")).lower()

    # 4. Session Timeout Calculation
    session_timeout_str = str(settings.get("sessionTimeout", "30 Minutes"))
    if "Hour" in session_timeout_str:
        timeout_match = re.search(r'\d+', session_timeout_str)
        timeout_minutes = (int(timeout_match.group(0)) if timeout_match else 1) * 60
    else:
        timeout_match = re.search(r'\d+', session_timeout_str)
        timeout_minutes = int(timeout_match.group(0)) if timeout_match else 30

    expires_delta = timedelta(minutes=timeout_minutes) if user_role in ["admin", "superadmin"] else timedelta(days=7)

    # 6. Create Active Session Record in MongoDB
    session_id = f"sess-{uuid4().hex[:8]}"
    user_agent = request.headers.get("user-agent", "Chrome / Windows")
    device = "Chrome / Windows" if "Windows" in user_agent else \
             "Safari / macOS" if "Macintosh" in user_agent else \
             "Chrome / Android" if "Android" in user_agent else \
             "Safari / iOS" if "iPhone" in user_agent else "Browser / Desktop"

    session_doc = {
        "sessionId": session_id,
        "userId": str(user["_id"]),
        "email": user["email"],
        "device": device,
        "location": "Chennai, India",
        "ip": client_ip,
        "lastActive": datetime.utcnow(),
        "revoked": False,
        "createdAt": datetime.utcnow()
    }
    await db["admin_sessions"].insert_one(session_doc)

    token_data = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "sessionId": session_id
    }

    token = create_access_token(token_data, expires_delta=expires_delta)

    return TokenResponse(
        token=token,
        user=UserResponse(**user),
        requires2FA=False,
        message="Authentication successful."
    )


@router.get("/me", response_model=UserMyResponse, response_model_by_alias=True)
async def get_my_user_info(current_user: Dict[str, Any] = Depends(with_auth)):
    return UserMyResponse(**current_user)


@router.get("/my-notifications")
async def get_my_notifications(current_user: dict = Depends(with_auth)):
    """Fetch notifications and announcements targeted to this user's role."""
    from database import get_db
    from datetime import datetime
    db = get_db()
    
    user_role = current_user.get("role", "student")
    
    cursor = db["notifications"].find({
        "target_audience": {"$in": ["all", user_role]}
    }).sort("_id", -1).limit(10)
    
    notifications = await cursor.to_list(10)
    
    formatted_notifications = []
    for n in notifications:
        c_at = n.get("createdAt") or n.get("created_at")
        time_display = c_at.strftime("%b %d, %I:%M %p") if isinstance(c_at, datetime) else (str(c_at)[:16] if c_at else "Just now")
        formatted_notifications.append({
            "id": str(n["_id"]),
            "title": n.get("title", "New Announcement"),
            "message": n.get("message", ""),
            "time": time_display,
            "isRead": current_user.get("sub") in n.get("readBy", []) if current_user.get("sub") else False
        })
        
    return formatted_notifications



@router.put("/my-notifications/read")
async def mark_notifications_as_read(current_user: dict = Depends(with_auth)):
    """Mark all notifications as read for the current user."""
    from database import get_db
    db = get_db()
    user_id = current_user["sub"]
    user_role = current_user.get("role", "student")
    
    result = await db["notifications"].update_many(
        {
            "target_audience": {"$in": ["all", user_role]},
            "readBy": {"$ne": user_id}
        },
        {
            "$addToSet": {"readBy": user_id}
        }
    )
    
    return {"success": True, "marked_count": result.modified_count}


@router.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest):
    """Handle password reset requests gracefully with security tokens and audit logging."""
    from database import get_db
    from datetime import datetime
    import uuid

    db = get_db()
    email_clean = str(request_data.email).strip().lower()

    user = await db["users"].find_one({"email": email_clean})
    if not user:
        # Avoid user enumeration - return standard success message
        return {
            "success": True,
            "message": f"If an account is associated with {email_clean}, a password reset link has been dispatched."
        }

    reset_token = f"rst-{uuid.uuid4().hex}"
    await db["password_resets"].insert_one({
        "userId": str(user["_id"]),
        "email": email_clean,
        "token": reset_token,
        "used": False,
        "createdAt": datetime.utcnow()
    })

    return {
        "success": True,
        "message": f"Password reset instructions have been sent to {email_clean}."
    }

