from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any
from database import get_db
from core.dependencies import with_auth
from schemas.settingsSchema import (
    SettingsUpdate,
    SettingsResponse,
    PasswordChangeRequest,
    PasswordChangeResponse,
    DefaultSettingsResponse,
)
from services.settingsService import SettingsService

router = APIRouter()


@router.get("/me", response_model=Dict[str, Any])
async def get_student_settings(current_user: Dict[str, Any] = Depends(with_auth)):
    """
    Get current user's settings.
    If settings don't exist, create and return default settings.
    """
    try:
        db = get_db()
        user_id = str(current_user.get("_id"))

        settings = await SettingsService.get_settings(user_id, db)

        if not settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Settings not found",
            )

        return settings

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] GET /settings/me failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve settings: {str(e)}",
        )


@router.put("/me", response_model=Dict[str, Any])
async def update_student_settings(
    updates: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """
    Update specific settings for current user.
    Only provided fields are updated, others remain unchanged.
    """
    try:
        db = get_db()
        user_id = str(current_user.get("_id"))

        # Validate input
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No settings provided to update",
            )

        # Update settings
        updated_settings = await SettingsService.update_settings(user_id, updates, db)

        if not updated_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Settings not found",
            )

        return updated_settings

    except ValueError as ve:
        print(f"[VALIDATION ERROR] {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] PUT /settings/me failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}",
        )


@router.post("/reset", response_model=Dict[str, Any])
async def reset_student_settings(
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """
    Reset all settings to default values.
    This action is reversible by updating settings again.
    """
    try:
        db = get_db()
        user_id = str(current_user.get("_id"))

        reset_settings = await SettingsService.reset_settings(user_id, db)

        if not reset_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Settings not found",
            )

        return {
            "success": True,
            "message": "Settings have been reset to defaults",
            "data": reset_settings,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] POST /settings/reset failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset settings: {str(e)}",
        )


@router.post("/password", response_model=Dict[str, Any])
async def change_password(
    password_request: PasswordChangeRequest,
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """
    Change user password.
    Requires current password verification and password strength validation.
    """
    try:
        db = get_db()
        user_id = str(current_user.get("_id"))

        # Change password
        result = await SettingsService.change_password(user_id, password_request, db)

        return result

    except ValueError as ve:
        print(f"[VALIDATION ERROR] {str(ve)}")
        error_message = str(ve)

        # Return 401 for incorrect current password
        if "Current password is incorrect" in error_message:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_message,
            )

        # Return 422 for other validation errors
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_message,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] POST /settings/password failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}",
        )


@router.delete("/me", response_model=Dict[str, Any])
async def deactivate_account(
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """
    Deactivate user account (soft delete).
    Account data is retained for 30 days before permanent deletion.
    User can contact support to recover account within 30 days.
    """
    try:
        db = get_db()
        user_id = str(current_user.get("_id"))

        result = await SettingsService.deactivate_account(user_id, db)

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] DELETE /settings/me failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate account: {str(e)}",
        )


@router.get("/defaults", response_model=Dict[str, Any])
async def get_default_settings():
    """
    Get default settings template.
    Useful for frontend to know available settings and their default values.
    No authentication required.
    """
    try:
        defaults = await SettingsService.get_default_settings()
        return {
            "success": True,
            "data": defaults,
        }

    except Exception as e:
        print(f"[ERROR] GET /settings/defaults failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve defaults: {str(e)}",
        )
