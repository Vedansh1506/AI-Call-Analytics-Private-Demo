import random
import string
from datetime import datetime, timedelta, timezone
from threading import Lock

OTP_EXPIRY_MINUTES = 10
OTP_LENGTH = 6

_store: dict[str, dict] = {}
_lock = Lock()


def _key(email: str, purpose: str) -> str:
    return f"{email}:{purpose}"


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def store_otp(email: str, purpose: str, otp: str) -> None:
    """Store OTP with expiry. Overwrites any existing OTP for same email+purpose."""
    with _lock:
        _store[_key(email, purpose)] = {
            "otp":        otp,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
            "attempts":   0,
        }


def verify_otp(email: str, purpose: str, otp: str) -> tuple[bool, str]:
    """
    Returns (True, "") on success.
    Returns (False, reason) on failure.
    Deletes OTP after successful verification.
    """
    with _lock:
        k = _key(email, purpose)
        record = _store.get(k)

        if not record:
            return False, "OTP not found or already used"

        if datetime.now(timezone.utc) > record["expires_at"]:
            _store.pop(k, None)
            return False, "OTP has expired"

        record["attempts"] += 1
        if record["attempts"] > 5:
            _store.pop(k, None)
            return False, "Too many attempts"

        if record["otp"] != otp.strip():
            return False, "Invalid OTP"

        _store.pop(k, None)
        return True, ""


def clear_otp(email: str, purpose: str) -> None:
    with _lock:
        _store.pop(_key(email, purpose), None)