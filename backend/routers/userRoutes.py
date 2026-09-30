import html
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Dict, Any
from core.security import create_access_token
from core.dependencies import with_auth
from core.config import settings
from schemas.userSchema import (
    UserCreate,
    UserMyResponse,
    UserResponse,
    TokenResponse,
    LoginRequest,
)
from services.userService import UserService
from services.oauth_service import authorization_url, get_profile, validate_state

router = APIRouter()


def _token_response(user):
    token = create_access_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"]})
    return TokenResponse(token=token, user=UserResponse(**user))


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
)
async def register(user_data: UserCreate):
    try:
        user_dict = await UserService.create_user(user_data)
        return UserResponse(**user_dict)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse, response_model_by_alias=True)
async def login(credentials: LoginRequest):
    try:
        user = await UserService.authenticate_user(
            credentials.email, credentials.password
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

        return _token_response(user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}",
        )


@router.get("/me", response_model=UserMyResponse, response_model_by_alias=True)
async def get_my_user_info(current_user: Dict[str, Any] = Depends(with_auth)):
    return UserMyResponse(**current_user)


@router.get("/oauth/{provider}/start", include_in_schema=False)
async def oauth_start(provider: str):
    frontend_origin = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    return RedirectResponse(authorization_url(provider, frontend_origin))


@router.get("/oauth/{provider}/callback", include_in_schema=False)
async def oauth_callback(provider: str, code: str = "", state: str = "", error: str = ""):
    origin = validate_state(state)
    if error:
        payload = {"type": "proeduvate-oauth-error", "message": "Sign-in was cancelled or denied by the provider."}
    else:
        try:
            profile = await get_profile(provider, code)
            user = await UserService.find_or_create_oauth_user(provider=provider, provider_id=profile["id"], email=profile["email"], name=profile["name"])
            result = _token_response(user)
            payload = {"type": "proeduvate-oauth-success", "token": result.token, "user": result.user.model_dump(by_alias=True, mode="json")}
        except HTTPException as exc:
            payload = {"type": "proeduvate-oauth-error", "message": str(exc.detail)}
        except Exception:
            payload = {"type": "proeduvate-oauth-error", "message": "Unable to complete social sign-in. Please try again."}
    message = json.dumps(payload).replace("<", "\\u003c")
    safe_origin = html.escape(origin, quote=True)
    return HTMLResponse(f"""<!doctype html><title>Signing in…</title><script>
      if (window.opener) window.opener.postMessage({message}, '{safe_origin}');
      window.close();
    </script><p>You can close this window.</p>""")
