from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import hashlib

from fastapi import APIRouter, HTTPException

from backend.ai.rag.loader import iter_txt_files, load_dataset
from backend.ai.utils.text import chunk_text
from backend.core.config import settings


router = APIRouter(prefix="/hackathon", tags=["Legacy Hackathon"])


def _stable_id(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:24]


def _dataset_to_legacy_hackathon(path) -> dict[str, Any]:
    document = load_dataset(path)
    chunks = chunk_text(document.text, 1000, 150)
    title = document.hackathon_id.replace("_", " ").title()
    themes = []
    description = document.text.split("\n\n", 1)[1].strip() if "\n\n" in document.text else document.text.strip()
    if "Sustainable" in title:
        themes = ["Sustainability", "Smart Cities", "Impact"]
    elif "Learning" in title:
        themes = ["EdTech", "AI", "Personalization"]
    elif "Volunteer" in title:
        themes = ["Operations", "Coordination", "Community"]

    return {
        "_id": document.hackathon_id,
        "id": document.hackathon_id,
        "title": title,
        "description": description,
        "themes": themes,
        "hackathonStart": datetime.now(timezone.utc).isoformat(),
        "duration": "48 Hours",
        "location": "Online",
        "status": "Open",
        "maxTeamSize": 4,
        "posterUrl": "",
        "participants_count": len(chunks) * 12,
        "organizer_name": "ProEduvate Partner",
    }


def _load_legacy_hackathons() -> list[dict[str, Any]]:
    datasets = list(iter_txt_files(settings.datasets_dir))
    hackathons = [_dataset_to_legacy_hackathon(path) for path in datasets]
    if hackathons:
        return hackathons
    return [
        {
            "_id": _stable_id("hackathon_1"),
            "id": _stable_id("hackathon_1"),
            "title": "Hackathon 1",
            "description": "Hackathon dataset unavailable.",
            "themes": [],
            "hackathonStart": datetime.now(timezone.utc).isoformat(),
            "duration": "48 Hours",
            "location": "Online",
            "status": "Open",
            "maxTeamSize": 4,
            "posterUrl": "",
            "participants_count": 0,
            "organizer_name": "ProEduvate Partner",
        }
    ]


@router.get("/allHackathons")
async def all_hackathons() -> list[dict[str, Any]]:
    return _load_legacy_hackathons()


@router.get("/myhackathons")
async def my_hackathons() -> list[dict[str, Any]]:
    return _load_legacy_hackathons()


@router.get("/{hackathon_id}")
async def hackathon_by_id(hackathon_id: str) -> dict[str, Any]:
    for hackathon in _load_legacy_hackathons():
        if hackathon["_id"] == hackathon_id or hackathon["id"] == hackathon_id:
            return hackathon
    raise HTTPException(status_code=404, detail="Hackathon not found")

