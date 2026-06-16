from __future__ import annotations

from pathlib import Path
import re


_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_MULTI_SPACE = re.compile(r"\s+")


def sanitize_text(value: str, limit: int = 8000) -> str:
    cleaned = _CONTROL_CHARS.sub(" ", value)
    cleaned = _MULTI_SPACE.sub(" ", cleaned).strip()
    return cleaned[:limit]


def secure_filename(name: str) -> str:
    base = Path(name).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", base)

