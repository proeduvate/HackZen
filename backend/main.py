from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.ai.init import initialize_ai_container
from backend.ai.routes.ai import router as ai_router
from backend.compat.hackathon import router as legacy_hackathon_router
from backend.ai.utils.logging import configure_logging
from backend.core.config import settings
from backend.core.rate_limiter import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    logger = logging.getLogger("hackathon_portal")
    logger.info("Starting Hackathon Portal backend")
    app.state.ai_container = await initialize_ai_container()
    try:
        yield
    finally:
        container = getattr(app.state, "ai_container", None)
        if container is not None:
            await container.aclose()
        logger.info("Stopped Hackathon Portal backend")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Production-ready AI-powered hackathon portal backend.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)

app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(legacy_hackathon_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root() -> dict[str, Any]:
    return {
        "success": True,
        "service": settings.app_name,
        "version": settings.version,
        "docs": "/docs",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": str(exc.detail),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger("hackathon_portal").exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.debug)

