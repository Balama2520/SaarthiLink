from fastapi import FastAPI, Depends, Request, Response
from fastapi import APIRouter
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import asyncio
import httpx
import logging
import uuid
import time

from app.core.config import get_settings
from app.core.logging import setup_logging, set_request_context, get_request_id
from app.core.rate_limit import rate_limiter
from app.database import engine
from app.api import api_router
from app.database.connection import SessionLocal
from app.engine.outbox_worker import OutboxWorker

# Initialize Settings
settings = get_settings()

# ── Logging (standard JSON, no structlog) ─────────────────────────────────────
setup_logging(is_production=not settings.DEBUG)
logger = logging.getLogger(__name__)

from app.core.cache import cache

# ── Lifespan: start/stop the Event Outbox Worker & Redis ──────────────────────
_outbox_worker = OutboxWorker(db_factory=SessionLocal, poll_interval=5.0)
_worker_task: asyncio.Task = None

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    global _worker_task
    await cache.connect()
    _worker_task = asyncio.create_task(_outbox_worker.start())
    logger.info("Event Outbox Worker started.")
    yield
    _outbox_worker.stop()
    if _worker_task:
        _worker_task.cancel()
    logger.info("Event Outbox Worker stopped.")
    await cache.close()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Career Copilot for Students",
    lifespan=lifespan,
)

# ── Request Tracing Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def request_tracing_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    set_request_context(request_id, path=request.url.path, method=request.method)

    start = time.perf_counter()
    try:
        if request.url.path.startswith("/api") and settings.RATE_LIMIT_ENABLED:
            forwarded_for = request.headers.get("x-forwarded-for", "")
            client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else ""
            if not client_ip and request.client:
                client_ip = request.client.host
            rate_limit_key = client_ip or "unknown-client"
            allowed = await rate_limiter.allow(rate_limit_key)
            if not allowed:
                logger.warning(
                    "Rate limit exceeded",
                    extra={"request_id": request_id, "request_path": request.url.path},
                )
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests", "request_id": request_id},
                )

        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "Request processed",
            extra={
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception:
        logger.exception("Unhandled exception during request processing")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "request_id": request_id},
        )

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # HSTS only in production (requires HTTPS)
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
# Normalize origins: strip whitespace, drop empty strings.
# When ALLOWED_ORIGINS is blank (e.g. local SQLite dev with default config) we
# skip the CORS middleware entirely (FastAPI defaults to same-origin-only).
_allowed_origins = [
    o.strip()
    for o in settings.ALLOWED_ORIGINS.split(",")
    if o and o.strip()
]
if _allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    logger.warning(
        "ALLOWED_ORIGINS is empty — CORS middleware not added. "
        "Cross-origin requests will be blocked by the browser. "
        "Set ALLOWED_ORIGINS to your frontend URLs (comma-separated) in production."
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_PREFIX)

# ── Health Endpoint ───────────────────────────────────────────────────────────
health_router = APIRouter()

@health_router.get("/health", tags=["ops"])
async def health():
    """
    Returns status of API, database, AI gateway, and Redis.
    All checks have tight timeouts so they never block.
    """
    result = {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "components": {
            "api": {"status": "ok"},
        },
    }

    # 1. Database
    try:
        db: Session = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        result["components"]["database"] = {"status": "ok"}
    except Exception:
        logger.exception("Database health check failed")
        result["components"]["database"] = {"status": "error"}
        result["status"] = "degraded"

    # 2. Redis
    try:
        if cache.redis_client:
            await asyncio.wait_for(cache.redis_client.ping(), timeout=1.0)
            result["components"]["redis"] = {"status": "ok"}
        else:
            result["components"]["redis"] = {"status": "unavailable"}
            if not settings.DEBUG:
                result["status"] = "degraded"
    except Exception:
        logger.exception("Redis health check failed")
        result["components"]["redis"] = {"status": "error"}
        if not settings.DEBUG:
            result["status"] = "degraded"

    # 3. AI Gateway.  A configured credential is deliberately not reported as
    # "ready": configuration proves only that a deployment supplied a key,
    # not that the remote provider is currently reachable or authorized.
    has_gemini = bool(settings.GEMINI_API_KEY)
    primary_provider = "gemini" if has_gemini else "ollama"
    ai_status = "configured" if has_gemini else "unavailable"

    # Only probe Ollama if it's the primary provider or explicitly tested
    if not has_gemini and settings.OLLAMA_URL:
        try:
            base_url = str(settings.OLLAMA_URL).split("/api/")[0]
            # Fast probe (0.5s timeout) to avoid blocking health checks
            async with httpx.AsyncClient(timeout=httpx.Timeout(0.5)) as client:
                res = await asyncio.wait_for(client.get(base_url), timeout=0.6)
                if res.status_code == 200:
                    ai_status = "ok"
        except Exception:
            ai_status = "unavailable"

    result["components"]["ai_gateway"] = {
        "status": ai_status,
        "provider": primary_provider,
        "fallback": "ollama" if has_gemini else "none",
    }

    # Integration configuration is safe to expose and gives the public UI an
    # honest status without returning credentials or making expensive external
    # requests from a health endpoint.
    result["components"]["huggingface"] = {
        "status": "configured" if settings.HF_SPACE_ID else "config_required",
    }
    result["components"]["google_sheets"] = {
        "status": (
            "configured"
            if settings.GOOGLE_SHEETS_SPREADSHEET_ID and settings.GOOGLE_SERVICE_ACCOUNT_JSON
            else "config_required"
        ),
    }

    # 4. Storage
    storage_configured = bool(getattr(settings, "SUPABASE_URL", None)) and bool(getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None))
    result["components"]["storage"] = {
        "status": "ok" if storage_configured else "unconfigured",
        "provider": "supabase" if storage_configured else "memory-only",
        "bucket": getattr(settings, "STORAGE_BUCKET", "resumes"),
    }

    return result


@health_router.get("/live", tags=["ops"])
async def liveness():
    """Kubernetes / container liveness probe. Always 200 when the process is up."""
    return {"live": True, "version": settings.VERSION, "timestamp": datetime.now(timezone.utc).isoformat()}


@health_router.get("/ready", tags=["ops"])
async def readiness():
    """Readiness probe: DB reachable + storage/AI configured. Returns 503 if any required component is down."""
    ready = {
        "ready": True,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {},
    }
    status_code = 200

    # 1) Database — required for readiness
    try:
        db: Session = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        ready["checks"]["database"] = "ok"
    except Exception:
        logger.exception("Readiness: database failed")
        ready["checks"]["database"] = "error"
        ready["ready"] = False
        status_code = 503

    # 2) Storage — warn only when unconfigured (optional feature)
    storage_configured = bool(getattr(settings, "SUPABASE_URL", None)) and bool(getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None))
    ready["checks"]["storage"] = "configured" if storage_configured else "unconfigured"

    # 3) AI provider — warn only (graceful degrade when key missing)
    has_gemini = bool(settings.GEMINI_API_KEY)
    ready["checks"]["ai_gateway"] = "configured" if has_gemini else "offline"

    from fastapi.responses import JSONResponse
    return JSONResponse(content=ready, status_code=status_code)


app.include_router(health_router, prefix=settings.API_PREFIX)

# ── Telemetry ─────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": settings.APP_NAME, "version": settings.VERSION, "status": "ok"}
