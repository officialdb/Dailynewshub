"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Pydantic settings for the Daily News Hub backend."""

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Daily News Hub"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/dailynewshub"
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CURRENTS_API_KEY: str = "your-currents-api-key"
    CURRENTS_API_URL: str = "https://api.currentsapi.services/v1"
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    UPLOADS_DIR: str = "uploads"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()
