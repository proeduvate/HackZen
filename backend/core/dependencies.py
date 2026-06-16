from __future__ import annotations

from fastapi import Depends, Request

from backend.ai.init import AIContainer
from backend.ai.services.ai_service import AIService
from backend.ai.services.dataset_service import DatasetService
from backend.ai.services.memory_service import MemoryService


def get_ai_container(request: Request) -> AIContainer:
    container = getattr(request.app.state, "ai_container", None)
    if container is None:
        raise RuntimeError("AI container has not been initialized")
    return container


def get_ai_service(container: AIContainer = Depends(get_ai_container)) -> AIService:
    return container.ai_service


def get_memory_service(container: AIContainer = Depends(get_ai_container)) -> MemoryService:
    return container.memory_service


def get_dataset_service(container: AIContainer = Depends(get_ai_container)) -> DatasetService:
    return container.dataset_service

