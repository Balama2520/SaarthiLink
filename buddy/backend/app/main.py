from fastapi import FastAPI, Depends, Request

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import httpx
import logging

from app.config import get_settings
from app.database import engine
from app import models, auth
# Import legacy services temporarily until full migration or if keeping them
from app.routes.sessions import router as sessions_router
from app.routes.chat import router as chat_router

# Initialize Settings
settings = get_settings()

# Initialize Database
models.Base.metadata.create_all(bind=engine)

import logging

logger = logging.getLogger(__name__)

app = FastAPI(

    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-grade AI Neural Interface"
)

# --- Middleware ---
@app.middleware("http")
async def validation_exception_handler_middleware(request: Request, call_next):
    # Custom robust middleware to catch any unhandled startup errors
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)}
        )

# CORS - Environment-specific origins for security
# CORS - Environment-specific origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PNA Middleware - Required for public websites to access local server
@app.middleware("http")
async def add_pna_header(request: Request, call_next):
    # This header tells the browser "Yes, I accept requests from the public internet"
    # It applies to the PREFLIGHT (OPTIONS) check if handled here, but mainly the actual response.
    # Note: For pure OPTIONS handling, CORSMiddleware usually takes precedence, but this helps on the actual fetch.
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# --- Routers ---
app.include_router(auth.router)
app.include_router(sessions_router)
app.include_router(chat_router)

# --- Health Check ---
@app.get("/health")
async def health():
    ollama_online = False
    model_status = "missing"
    try:
        # Base URL check for Ollama - Try localhost then 127.0.0.1
        urls = [
            str(settings.OLLAMA_URL).split("/api/")[0],
            "http://127.0.0.1:11434"
        ]
        
        async with httpx.AsyncClient(timeout=2.0) as client:
            for url in urls:
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        ollama_online = True
                        # Check if model exists
                        tags_res = await client.get(f"{url}/api/tags")
                        if tags_res.status_code == 200:
                            models_data = tags_res.json().get("models", [])
                            if any(m.get("name", "").startswith(settings.DEFAULT_MODEL) for m in models_data):
                                model_status = "ready"
                            else:
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
    return {"message": "Buddy AI Neural Link Online"}
