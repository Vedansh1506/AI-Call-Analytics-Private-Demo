from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.schemas import UserUpdate
from routers.auth import _require_csrf, get_current_user, get_db
from utils.config import settings

router = APIRouter(prefix="/api", tags=["APIs"])

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "frontend_idle_timeout_minutes": settings.FRONTEND_IDLE_TIMEOUT_MINUTES,
    }

@router.put("/me")
def update_me(
    user_data: UserUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    csrf_ok: None = Depends(_require_csrf)
):
    if user_data.first_name:
        current_user.first_name = user_data.first_name
    if user_data.last_name:
        current_user.last_name = user_data.last_name
    if user_data.mobile_no:
        current_user.mobile_no = user_data.mobile_no

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Profile updated successfully"
    }

@router.delete("/me")
def delete_me(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    csrf_ok: None = Depends(_require_csrf)

):
    try:
        db.delete(current_user)
        db.commit()
        return {"success": True, "message": "User deleted successfully"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete user")
