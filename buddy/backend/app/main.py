from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import httpx

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(sessions_router)
app.include_router(chat_router)

# --- Health Check ---
@app.get("/health")
async def health():
    ollama_online = False
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            res = await client.get(settings.OLLAMA_URL.replace("/api/generate", ""))
            ollama_online = res.status_code == 200
    except Exception as e:
        # Ollama not reachable
        ollama_online = False

    return {
        "status": "online",
        "neural_engine": "active" if ollama_online else "offline",
        "time": datetime.now(timezone.utc).isoformat(),
        "target_ollama": settings.OLLAMA_URL
    }

# --- Root ---
@app.get("/")
def root():
    return {"message": "Buddy AI Neural Link Online"}
