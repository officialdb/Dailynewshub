"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Pydantic settings for the Daily News Hub backend."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    APP_NAME: str = "Daily News Hub"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/dailynewshub"
    DATABASE_V2_URL: str = "postgresql+asyncpg://localhost:5432/dailynewshub"
    # --- SEC FIX SEC-002 ---
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CURRENTS_API_KEY: str = "your-currents-api-key"
    CURRENTS_API_URL: str = "https://api.currentsapi.services/v1"
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    # --- SEC FIX SEC-013 ---
    FIREBASE_CREDENTIALS_JSON: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    UPLOADS_DIR: str = "uploads"
    FRONTEND_URL: str = "http://localhost:3000"
    # --- SEC FIX SEC-010 ---
    APP_BASE_URL: str = "http://localhost:8000"
    RSS_EDITOR_EMAIL: str = "editor@dailynewshub.com"
    # --- SEC FIX SEC-007 ---
    ADMIN_DASH_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # --- NEW ADDITION ---
    YOUTUBE_API_KEY: str = ""
    YOUTUBE_NEWS_CHANNEL_IDS: str = ""
    GROQ_API_KEY: str = ""
    GOOGLE_TTS_API_KEY: str = ""
    # --- SEC FIX SEC-002 ---
    DEVELOPER_SECRET_KEY: str = ""
    DEVELOPER_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DEVELOPER_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    TIER_ENDPOINT_PERMISSIONS: dict[str, list[str]] = {
        "free": ["articles", "categories", "search", "trending"],
        "starter": ["articles", "categories", "search", "trending", "reels"],
        "pro": ["articles", "categories", "search", "trending", "reels", "recommendations", "users"],
        "enterprise": ["*"],
    }
    # --- SEC FIX SEC-008 ---
    # Explicit list of allowed origins for CORS. Never use "*" with credentials.
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    # --- SEC FIX SEC-008 ---
    ALLOWED_ORIGINS_PROD: list[str] = [
        "https://admin.dailynewshub.com",
        "https://developers.dailynewshub.com",
        "https://dailynewshub-one.vercel.app",
    ]

    # --- SEC FIX SEC-002 ---
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v or v in ("your-secret-key-here", "secret", "change-me", ""):
            raise ValueError(
                "SECRET_KEY must be set to a strong random value. "
                "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters (256 bits)")
        return v

    # --- SEC FIX SEC-002 ---
    @field_validator("DEVELOPER_SECRET_KEY")
    @classmethod
    def validate_developer_secret_key(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "DEVELOPER_SECRET_KEY must be set and at least 32 characters. "
                "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    # --- SEC FIX SEC-008 ---
    @field_validator("ALLOWED_ORIGINS", "ALLOWED_ORIGINS_PROD", mode="before")
    @classmethod
    def parse_origin_list(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # --- SEC FIX SEC-008 ---
    @property
    def cors_origins(self) -> list[str]:
        """Return the correct CORS origin list based on environment."""
        if self.ENVIRONMENT == "production":
            return self.ALLOWED_ORIGINS_PROD
        return self.ALLOWED_ORIGINS

    # --- BUG FIX ---
    @property
    def youtube_channel_ids_list(self) -> list[str]:
        """Parse comma-separated channel IDs into a list."""
        return [
            ch.strip()
            for ch in self.YOUTUBE_NEWS_CHANNEL_IDS.split(",")
            if ch.strip()
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()
