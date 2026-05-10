from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from core.security import create_access_token
from core.dependencies import with_auth
from schemas.userSchema import (
    UserCreate,
    UserMyResponse,
    UserResponse,
    TokenResponse,
    LoginRequest,
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

        token_data = {
            "sub": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
        }

        token = create_access_token(token_data)

        return TokenResponse(token=token, user=UserResponse(**user))
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
