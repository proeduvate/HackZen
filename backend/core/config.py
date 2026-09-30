from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # App
    FRONTEND_URL: Optional[str] = None
    BACKEND_URL: Optional[str] = None
    # OAuth callback base, for example http://127.0.0.1:8000 in development.
    # Register <OAUTH_REDIRECT_BASE_URL>/api/auth/oauth/<provider>/callback
    # with each provider.
    OAUTH_REDIRECT_BASE_URL: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    APP_NAME: str = "ProEduvate Hackathon Platform"
    DEBUG: bool = False

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_value(cls, value):
        """Accept common deployment labels as well as true/false values."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value

    # MongoDB
    MONGO_URI: str = "mongodb://127.0.0.1:27017"
    LOG_LEVEL: str = "INFO"

    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # JWT
    SECRET_KEY: str = "dev-secret-key-change-me"
    ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN: int = 30
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: str = "proeduvate"
    JWT_AUDIENCE: str = "proeduvate-users"
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DB_NAME: str = "hackathon_db"

    # AI Services
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    # Vector Database
    VECTOR_DB_URL: Optional[str] = None
    VECTOR_DB_COLLECTION: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
