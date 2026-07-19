from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi import APIRouter

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pathlib import Path
import asyncio
import httpx
import logging

from app.config import get_settings
from app.database import engine
from app import models
from app.api import api_router

# Initialize Settings
settings = get_settings()

# Initialize Database
models.Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Career Copilot for Students"
)

# --- Middleware ---
@app.middleware("http")
async def validation_exception_handler_middleware(request: Request, call_next):
    # Custom robust middleware to catch any unhandled startup errors
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error("Unhandled middleware exception", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)}
        )

# CORS - Environment-specific origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PNA Middleware - Required for public websites to access local server
# @app.middleware("http")
# async def add_pna_header(request: Request, call_next):
#     if request.method == "OPTIONS":
#         response = JSONResponse(content={"message": "PNA Preflight OK"})
#         response.headers["Access-Control-Allow-Private-Network"] = "true"
#         response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
#         response.headers["Access-Control-Allow-Methods"] = "*"
#         response.headers["Access-Control-Allow-Headers"] = "*"
#         return response

#     response = await call_next(request)
#     response.headers["Access-Control-Allow-Private-Network"] = "true"
#     return response

# --- Routers ---
# --- Health Check ---
health_router = APIRouter()

@health_router.get("/health")
async def health():
    ollama_online = False
    model_status = "missing"
    try:
        # Base URL check for Ollama - Try localhost then 127.0.0.1
        urls = [
            str(settings.OLLAMA_URL).split("/api/")[0],
            "http://127.0.0.1:11434"
        ]
        
        timeout = httpx.Timeout(2.0, connect=2.0, read=2.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            for url in urls:
                try:
                    res = await asyncio.wait_for(client.get(url), timeout=2.5)
                    if res.status_code == 200:
                        ollama_online = True
                        # Check if model exists
                        try:
                            tags_res = await asyncio.wait_for(client.get(f"{url}/api/tags"), timeout=2.5)
                            if tags_res.status_code == 200:
                                models_data = tags_res.json().get("models", [])
                                if any(m.get("name", "").startswith(settings.DEFAULT_MODEL) for m in models_data):
                                    model_status = "ready"
                                else:
                                    model_status = "download_required"
                        except Exception:
                            model_status = "download_required"
                        break
                except Exception:
                    continue

    except Exception as e:
        logger.warning(f"Health check: Ollama connection failed: {e}")
        ollama_online = False

    return {
        "status": "online",
        "neural_engine": "active" if ollama_online else "offline",
        "model_engine": model_status,
        "time": datetime.now(timezone.utc).isoformat(),
        "target_ollama": settings.OLLAMA_URL
    }

app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(health_router, prefix=settings.API_PREFIX)

# Serve frontend static files
ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

@app.get("/telemetry")
async def telemetry():
    import psutil
    import os
    import platform
    import sys
    process = psutil.Process(os.getpid())
    return {
        "status": "synchronized",
        "cpu_usage": psutil.cpu_percent(),
        "memory_usage": process.memory_info().rss / (1024 * 1024),  # MB
        "threads": process.num_threads(),
        "uptime": datetime.now(timezone.utc).isoformat(),
        "load_avg": os.getloadavg() if hasattr(os, 'getloadavg') else [0,0,0],
        "metadata": {
            "os": platform.system(),
            "python": sys.version.split()[0],
            "arch": platform.machine()
        }
    }


# --- Root ---

@app.get("/")
def root():
    return {"message": "Saarthi AI Neural Link Online"}
