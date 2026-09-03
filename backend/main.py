from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from core.config import settings
from database import MongoDB
from routers import indexRoutes

# Get absolute path for uploads directory
BASE_DIR = Path(__file__).parent.resolve()
UPLOADS_DIR = BASE_DIR / "uploads"

# Create uploads directory if it doesn't exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
print(f"[Uploads] Directory: {UPLOADS_DIR}")



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await MongoDB.connect()
    yield
    # Shutdown
    await MongoDB.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    contact={
        "name": "ProEduvate Team",
        "email": "support@proeduvate.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://proeduvate.com/license",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Total-Count"],
)

# Serve static files (uploads)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(indexRoutes.router, prefix="/api")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to ProEduvate Hackathon Platform"}


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "dependencies": {},
    }

    # Check MongoDB connection
    try:
        await MongoDB.get_db().command("ping")
        health_status["dependencies"]["mongodb"] = "connected"
    except Exception as e:
        health_status["dependencies"]["mongodb"] = "disconnected"
        health_status["status"] = "degraded"
        health_status["mongodb_error"] = str(e)

    # Check uploads directory
    if UPLOADS_DIR.exists():
        health_status["dependencies"]["uploads_dir"] = "available"
    else:
        health_status["dependencies"]["uploads_dir"] = "missing"
        health_status["status"] = "degraded"

    return health_status


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Handle HTTP exceptions with consistent error format
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            }
        },
        headers=exc.headers if hasattr(exc, "headers") else None,
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    """
    Handle internal server errors
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
                "detail": str(exc) if settings.DEBUG else "Contact support for details",
            }
        },
    )


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("[STARTING] PROEDUVATE HACKATHON PLATFORM")
    print("=" * 60)
    print(f"App: {settings.APP_NAME}")
    print(f"Host: {settings.BACKEND_URL}")
    print(f"Docs: http://{settings.BACKEND_URL}/docs")
    print("=" * 60)

    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
