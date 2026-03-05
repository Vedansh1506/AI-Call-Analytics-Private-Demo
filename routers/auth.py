import re
import secrets
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from models import model
from models.schemas import TokenValidateRequest, UserRegister
from utils.config import settings
from utils.database import get_db
from utils.logger import get_logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
password_context = CryptContext(schemes=["bcrypt"], deprecated ="auto")
logger = get_logger(__name__)

ACCESS_COOKIE_NAME = "access_token"
CSRF_COOKIE_NAME = "csrf_token"
COOKIE_SAMESITE = settings.COOKIE_SAMESITE
COOKIE_SECURE = settings.COOKIE_SECURE
COOKIE_DOMAIN = settings.COOKIE_DOMAIN

_auth_guard_lock = Lock()
_failed_attempts_by_email = defaultdict(deque)  # email -> deque[datetime]
_attempts_by_ip = defaultdict(deque)            # ip -> deque[datetime]
_locked_until_by_email: dict[str, datetime] = {}

PASSWORD_MIN_LENGTH = 8
PASSWORD_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _prune_attempts(items: deque, window_seconds: int, now: datetime) -> None:
    cutoff = now - timedelta(seconds=window_seconds)
    while items and items[0] < cutoff:
        items.popleft()


def _audit_auth_event(event: str, request: Request, email: str | None = None, user_id: int | None = None, reason: str | None = None) -> None:
    ip = _client_ip(request)
    logger.info(
        f"auth_event={event} ip={ip} email={email or '-'} user_id={user_id or '-'} reason={reason or '-'}"
    )


def _enforce_login_guards(email: str, request: Request) -> None:
    now = _now_utc()
    ip = _client_ip(request)

    with _auth_guard_lock:
        locked_until = _locked_until_by_email.get(email)
        if locked_until and locked_until > now:
            remaining = int((locked_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account temporarily locked. Try again in {remaining} seconds."
            )
        if locked_until and locked_until <= now:
            _locked_until_by_email.pop(email, None)

        ip_attempts = _attempts_by_ip[ip]
        _prune_attempts(ip_attempts, settings.AUTH_RATE_LIMIT_WINDOW_SECONDS, now)
        if len(ip_attempts) >= settings.AUTH_RATE_LIMIT_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again shortly."
            )


def _record_login_failure(email: str, request: Request) -> None:
    now = _now_utc()
    ip = _client_ip(request)

    with _auth_guard_lock:
        ip_attempts = _attempts_by_ip[ip]
        email_attempts = _failed_attempts_by_email[email]

        ip_attempts.append(now)
        email_attempts.append(now)

        _prune_attempts(ip_attempts, settings.AUTH_RATE_LIMIT_WINDOW_SECONDS, now)
        _prune_attempts(email_attempts, settings.AUTH_LOCKOUT_SECONDS, now)

        if len(email_attempts) >= settings.AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS:
            _locked_until_by_email[email] = now + timedelta(seconds=settings.AUTH_LOCKOUT_SECONDS)
            _failed_attempts_by_email[email].clear()

def _clear_login_failures(email: str) -> None:
    with _auth_guard_lock:
        _failed_attempts_by_email.pop(email, None)
        _locked_until_by_email.pop(email, None)

def _extract_bearer_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()

def _require_csrf(
    request: Request,
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    csrf_cookie: str | None = Cookie(default=None, alias=CSRF_COOKIE_NAME),
):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
            raise HTTPException(status_code=403, detail="CSRF validation failed")


def _validate_password_policy(password: str) -> list[str]:
    failures: list[str] = []
    if len(password or "") < PASSWORD_MIN_LENGTH:
        failures.append(f"At least {PASSWORD_MIN_LENGTH} characters")
    if not any(c.isupper() for c in password or ""):
        failures.append("At least one uppercase letter")
    if not any(c.islower() for c in password or ""):
        failures.append("At least one lowercase letter")
    if not any(c.isdigit() for c in password or ""):
        failures.append("At least one number")
    if not PASSWORD_SPECIAL_RE.search(password or ""):
        failures.append("At least one special character")
    return failures

def get_hashed_password(password: str) -> str:
    return password_context.hash(password)

def verify_password(password: str, hashed_pass: str) -> bool:
    return password_context.verify(password, hashed_pass)

def authenticate_user(email: str, password: str, db):
    user = db.query(model.AuthUser).filter(model.AuthUser.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user

def generate_token(user, expires_minutes: int):
    now = datetime.now(timezone.utc)

    payload = {
        'sub': user.email,
        'exp': now + timedelta(minutes=expires_minutes),
        'iat': now,
    }

    token = jwt.encode(payload, settings.SECRET_KEY, settings.ALGORITHM)
    return token

def get_current_user(
    request: Request,
    token_from_oauth: str | None = Depends(oauth2_scheme),
    cookie_token: str | None = Cookie(default=None, alias=ACCESS_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = token_from_oauth or cookie_token
    if not token:
        # fallback: parse Authorization header manually (optional)
        token = _extract_bearer_token(request.headers.get("Authorization"))
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(model.AuthUser).filter(model.AuthUser.email == email).first()
    if not user:
        raise credentials_exception
    return user

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user:UserRegister, db: Session = Depends(get_db)):

    existing_user = db.query(model.AuthUser).filter(model.AuthUser.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    password_failures = _validate_password_policy(user.password)
    if password_failures:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet requirements: " + ", ".join(password_failures),
        )
    
    try:
        new_user = model.AuthUser(
            first_name=user.first_name,
            last_name=user.last_name,
            mobile_no=user.mobile_no,
            email=user.email,
            password=get_hashed_password(user.password)
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while creating user"
        )
    
    return {
        "success": True,
        "message": "User registered successfully"
    }

@router.post("/login")
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username.lower().strip()

    try:
        _enforce_login_guards(email, request)
    except HTTPException as e:
        _audit_auth_event("login_blocked", request, email=email, reason=e.detail)
        raise

    user = authenticate_user(
        email=email,
        password=form_data.password,
        db=db
    )

    if not user:
        _record_login_failure(email, request)
        _audit_auth_event("login_failed", request, email=email, reason="invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    _clear_login_failures(email)

    access_token = generate_token(
        user=user,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    csrf_token = secrets.token_urlsafe(32)

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,  # must be readable by JS for double-submit pattern
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    _audit_auth_event("login_success", request, email=user.email, user_id=user.id)

    return {
        "success": True,
        "message": "Login successful"
    }

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    csrf_ok: None = Depends(_require_csrf)
):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/", domain=COOKIE_DOMAIN)
    response.delete_cookie(CSRF_COOKIE_NAME, path="/", domain=COOKIE_DOMAIN)
    _audit_auth_event("logout", request)
    return {"success": True, "message": "Logged out"}

@router.post('/verify-token')
def verify_token(data: TokenValidateRequest):
    try:
        payload = jwt.decode(
            data.token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        return{
            "valid":True,
            "message":"Token is valid!",
            "subject":payload.get("sub"),
            "expires_at":datetime.fromtimestamp(
                payload.get("exp"), tz=timezone.utc
            ).isoformat()
        }

    except ExpiredSignatureError:
        return{
            "valid":False,
            "message": "Token has expired!"
        }
    
    except JWTError:
        return{
            "valid":False,
            "message": "Invalid Token!"
        }
