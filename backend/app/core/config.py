import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field, field_validator
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Saarthi AI"
    VERSION: str = "2.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # API Config
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 2520

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'saarthi.db')}",
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Security
    # Secrets are deployment configuration.  There must never be a shared,
    # source-controlled fallback that could be used to forge production JWTs.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    # Admin access is opt-in.  Generic account names must not become admins
    # merely because a deployment omitted this setting.
    ADMIN_USERNAMES: str = os.getenv("ADMIN_USERNAMES", "")
    INGEST_API_KEY: str = os.getenv("INGEST_API_KEY", "")
    INGEST_WEBHOOK_TOKEN: str = os.getenv("INGEST_WEBHOOK_TOKEN", "")

    # CORS Configuration
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:2520,https://saarthi-link.netlify.app,https://saarthilink.onrender.com",
    )

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "120"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    # Integrations & Communications
    SAARTHI_CONTACT_EMAIL: str = os.getenv("SAARTHI_CONTACT_EMAIL", "saarthi.ai.team@gmail.com")
    HF_SPACE_ID: str = Field(
        default="Balamaneesh2520/saarthi-ai-brain",
        validation_alias=AliasChoices("HF_SPACE_ID", "SAARTHI_AI_SPACE"),
    )
    HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
    HF_API_NAME: str = os.getenv("HF_API_NAME", "generate")
    GOOGLE_SHEETS_SPREADSHEET_ID: str = os.getenv(
        "GOOGLE_SHEETS_SPREADSHEET_ID", "1qPGJYxq_Nq-33xda4ZYA7DkX9pP2_VrMlWQAaviiI44"
    )
    GOOGLE_SERVICE_ACCOUNT_JSON: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "resumes")

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v):
        if not v:
            logger.warning(
                "SECRET_KEY is not configured; authentication is unavailable until it is set."
            )
        return v

    @field_validator("ENVIRONMENT")
    @classmethod
    def normalize_environment(cls, v: str) -> str:
        return v.strip().lower()

    def model_post_init(self, __context) -> None:
        if self.ENVIRONMENT == "production":
            if len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if not self.ALLOWED_ORIGINS.strip():
                raise ValueError(
                    "ALLOWED_ORIGINS must list explicit frontend origins in production"
                )

    # AI Engine — Ollama (primary) with Gemini fallback
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    DEFAULT_MODEL: str = "phi3"
    OLLAMA_TIMEOUT: int = 30  # seconds before timeout and Gemini fallback kicks in

    # Gemini API fallback
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    SYSTEM_PROMPT: str = (
        "You are Saarthi AI, an advanced career intelligence system for students, job seekers, and employers. "
        "You specialize in helping people navigate career journeys, hiring workflows, and job readiness. "
        "Be concise, structured, and highly practical. Use markdown when helpful. No unnecessary emojis."
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings():
    return Settings()
