from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import os
from typing import List

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional in minimal environments
    load_dotenv = None


_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
if load_dotenv is not None:
    load_dotenv(_ROOT_ENV, override=False)


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return float(value)


def _env_list(name: str, default: List[str]) -> List[str]:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(slots=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Hackathon Portal AI Backend")
    version: str = os.getenv("APP_VERSION", "1.0.0")
    debug: bool = _env_bool("DEBUG", False)
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()
    cors_origins: List[str] = field(default_factory=list)

    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    openrouter_temperature: float = _env_float("OPENROUTER_TEMPERATURE", 0.7)
    openrouter_max_tokens: int = _env_int("OPENROUTER_MAX_TOKENS", 1000)
    openrouter_timeout_seconds: float = _env_float("OPENROUTER_TIMEOUT_SECONDS", 30.0)
    openrouter_retry_attempts: int = _env_int("OPENROUTER_RETRY_ATTEMPTS", 3)
    openrouter_retry_backoff_seconds: float = _env_float(
        "OPENROUTER_RETRY_BACKOFF_SECONDS", 1.25
    )

    rate_limit_requests: int = _env_int("RATE_LIMIT_REQUESTS", 60)
    rate_limit_window_seconds: int = _env_int("RATE_LIMIT_WINDOW_SECONDS", 60)
    max_upload_size_mb: int = _env_int("MAX_UPLOAD_SIZE_MB", 5)

    datasets_dir: Path = Path(
        os.getenv(
            "DATASETS_DIR", Path(__file__).resolve().parents[1] / "data" / "datasets"
        )
    )
    memory_dir: Path = Path(
        os.getenv("MEMORY_DIR", Path(__file__).resolve().parents[1] / "data" / "memory")
    )
    logs_dir: Path = Path(
        os.getenv("LOGS_DIR", Path(__file__).resolve().parents[1] / "logs")
    )

    rag_chunk_size: int = _env_int("RAG_CHUNK_SIZE", 1000)
    rag_chunk_overlap: int = _env_int("RAG_CHUNK_OVERLAP", 150)
    rag_top_k: int = _env_int("RAG_TOP_K", 4)
    history_limit: int = _env_int("HISTORY_LIMIT", 12)

    def __post_init__(self) -> None:
        origins = _env_list(
            "CORS_ORIGINS",
            [
                self.frontend_url,
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ],
        )
        self.cors_origins = list(dict.fromkeys(origins))


settings = Settings()
settings.datasets_dir.mkdir(parents=True, exist_ok=True)
settings.memory_dir.mkdir(parents=True, exist_ok=True)
settings.logs_dir.mkdir(parents=True, exist_ok=True)
