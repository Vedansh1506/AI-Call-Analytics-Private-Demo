from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from routers.auth import (
    ACCESS_COOKIE_NAME,
    COOKIE_DOMAIN,
    CSRF_COOKIE_NAME,
    _validate_password_policy,
    get_current_user,
    get_db,
    get_hashed_password,
    verify_password,
)
from utils.config import settings
from utils.email import send_otp_email
from utils.otp import generate_otp, store_otp, verify_otp

router = APIRouter(prefix="/api", tags=["APIs"])


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id":           current_user.id,
        "first_name":   current_user.first_name,
        "last_name":    current_user.last_name,
        "email":        current_user.email,
        "mobile_no":    current_user.mobile_no,
        "frontend_idle_timeout_minutes": settings.FRONTEND_IDLE_TIMEOUT_MINUTES,
    }


@router.patch("/me")
async def update_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    body       = await request.json()
    first_name = body.get("first_name", "").strip()
    last_name  = body.get("last_name",  "").strip()
    mobile_no  = body.get("mobile_no",  "").strip()

    if first_name: 
        current_user.first_name = first_name
    if last_name:  
        current_user.last_name  = last_name
    if mobile_no:  
        current_user.mobile_no  = mobile_no

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "user": {
            "first_name": current_user.first_name,
            "last_name":  current_user.last_name,
            "email":      current_user.email,
            "mobile_no":  current_user.mobile_no,
        }
    }


@router.post("/me/request-change-password-otp")
async def request_change_password_otp(
    current_user=Depends(get_current_user),
):
    otp = generate_otp()
    store_otp(current_user.email, "change_password", otp)
    await send_otp_email(current_user.email, otp, "change_password")
    return {"success": True, "message": "OTP sent to your email"}


@router.post("/me/change-password")
async def change_password(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    body       = await request.json()
    current_pw = body.get("current_password", "")
    otp        = body.get("otp", "").strip()
    new_pw     = body.get("new_password", "")

    if not verify_password(current_pw, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    ok, reason = verify_otp(current_user.email, "change_password", otp)
    if not ok:
        raise HTTPException(status_code=400, detail=reason)

    failures = _validate_password_policy(new_pw)
    if failures:
        raise HTTPException(
            status_code=400,
            detail="Password does not meet requirements: " + ", ".join(failures),
        )

    current_user.password = get_hashed_password(new_pw)
    db.commit()
    return {"success": True, "message": "Password changed successfully"}


@router.delete("/me")
async def delete_account(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/", domain=COOKIE_DOMAIN)
    response.delete_cookie(CSRF_COOKIE_NAME,   path="/", domain=COOKIE_DOMAIN)
    return {"success": True, "message": "Account deleted"}