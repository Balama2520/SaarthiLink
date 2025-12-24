import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Buddy AI"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # API Config
    API_PREFIX: str = ""
    HOST: str = "0.0.0.0"
    PORT: int = 2520
    
    # Database
    DATABASE_URL: str = "sqlite:///./buddy.db"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY environment variable must be set for security")
    
    # AI Engine (Ollama - Simple & Free)
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    DEFAULT_MODEL: str = "gemma3:1b"
    SYSTEM_PROMPT: str = "You are Buddy AI, an advanced neural interface assistant. Be concise, helpful, and futuristic."

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
