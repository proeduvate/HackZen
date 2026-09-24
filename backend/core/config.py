from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
_BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"
if load_dotenv is not None:
    if _BACKEND_ENV.exists():
        load_dotenv(_BACKEND_ENV, override=False)
    if _ROOT_ENV.exists():
        load_dotenv(_ROOT_ENV, override=False)


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = os.getenv("APP_NAME", "ProEduvate Hackathon Platform")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes"}
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "hackzen")

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "proeduvate-hackzen-secret-key-2026")
    ALLOW_MOCK_AUTH: bool = os.getenv("ALLOW_MOCK_AUTH", "true").lower() == "true"
    ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "30")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: str = "proeduvate"
    JWT_AUDIENCE: str = "proeduvate-users"
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # SMTP / Email Service
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: Optional[str] = os.getenv("EMAIL_FROM", "noreply@hackzen.com")

    # AI Services & Keys
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    NVIDIA_API_KEY: Optional[str] = os.getenv("NVIDIA_API_KEY")

    # OAuth Providers
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    GITHUB_CLIENT_ID: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")

    # OpenRouter & AI Portal Extensions
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    openrouter_temperature: float = 0.7
    openrouter_max_tokens: int = 1000
    openrouter_timeout_seconds: float = 30.0
    openrouter_retry_attempts: int = 3
    openrouter_retry_backoff_seconds: float = 1.25

    # Rate Limiting & RAG Engine
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    max_upload_size_mb: int = 5
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 150
    rag_top_k: int = 4
    history_limit: int = 12

    # Storage Paths
    datasets_dir: Path = Path(os.getenv("DATASETS_DIR", Path(__file__).resolve().parents[1] / "data" / "datasets"))
    memory_dir: Path = Path(os.getenv("MEMORY_DIR", Path(__file__).resolve().parents[1] / "data" / "memory"))
    logs_dir: Path = Path(os.getenv("LOGS_DIR", Path(__file__).resolve().parents[1] / "logs"))

    # CORS Origins
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    # Lowercase compatibility properties
    @property
    def app_name(self) -> str:
        return self.APP_NAME

    @property
    def version(self) -> str:
        return self.APP_VERSION

    @property
    def debug(self) -> bool:
        return self.DEBUG

    @property
    def log_level(self) -> str:
        return self.LOG_LEVEL

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "on", "debug", "dev"}

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

try:
    settings.datasets_dir.mkdir(parents=True, exist_ok=True)
    settings.memory_dir.mkdir(parents=True, exist_ok=True)
    settings.logs_dir.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
