import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Saarthi AI"
    VERSION: str = "2.1.0"
    DEBUG: bool = False

    # API Config
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 2520

    # Database
    DATABASE_URL: str = "sqlite:///./saarthi.db"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY") or "DEVELOPMENT_MODE_UNSAFE_SECRET_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # CORS Configuration
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v):
        _DEV_KEY = "DEVELOPMENT_MODE_UNSAFE_SECRET_CHANGE_ME"
        if not v or v == _DEV_KEY:
            logger.critical(
                "\n"
                "═══════════════════════════════════════════════════\n"
                "⚠️  SECURITY WARNING: Insecure SECRET_KEY in use!  ⚠️\n"
                "   Set a strong SECRET_KEY in your .env file.      \n"
                "   All JWTs can be forged in this configuration.   \n"
                "═══════════════════════════════════════════════════"
            )
        return v

    # AI Engine — Ollama (primary) with Gemini fallback
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://51.20.92.188:11434/api/generate")
    DEFAULT_MODEL: str = "phi3"
    OLLAMA_TIMEOUT: int = 30  # seconds before timeout and Gemini fallback kicks in

    # Gemini API fallback
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-1.5-flash"

    SYSTEM_PROMPT: str = (
        "You are Saarthi AI, an advanced career intelligence system developed by Bala Maneesh Ayanala. "
        "You specialize in helping Indian students and professionals navigate their career journeys. "
        "Be concise, structured, and highly practical. Use markdown when helpful. No unnecessary emojis."
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings():
    return Settings()
