from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent 

class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file=BASE_DIR / ".env",
    extra="ignore",
  )

  DATABASE_URL: str
  SECRET_KEY: str
  ALGORITHM: str
  ACCESS_TOKEN_EXPIRE_MINUTES: int 
  ASSEMBLYAI_API_KEY: str
  GEMINI_API_KEY: str
  CELERY_BROKER_URL: str = "redis://localhost:6379/0"
  CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

  UPLOAD_AUDIO_DIR: str = str(BASE_DIR / "uploads" / "audio")

  CORS_ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
  COOKIE_SAMESITE: str = "lax"
  COOKIE_SECURE: bool = False
  COOKIE_DOMAIN: str | None = None

  AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: int = 10
  AUTH_LOCKOUT_SECONDS: int = 900
  AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS: int = 5
  FRONTEND_IDLE_TIMEOUT_MINUTES: int = 30

  @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
  @classmethod
  def parse_origins(cls, v):
    if isinstance(v, str):
        return [x.strip() for x in v.split(",") if x.strip()]
    return v

settings = Settings()

SUPPORTED_LANGUAGES = {
    "ar": "Arabic",
    "zh": "Chinese (Mandarin)",
    "nl": "Dutch",
    "en": "English",
    "fr": "French",
    "de": "German",
    "gu": "Gujarati",
    "he": "Hebrew",
    "hi": "Hindi",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "mr": "Marathi",
    "pt": "Portuguese",
    "ru": "Russian",
    "es": "Spanish",
    "ta": "Tamil",
    "tr": "Turkish",
    "vi": "Vietnamese"
}
