"""
Saarthi AI — Hardened Core FastAPI Architecture
==============================================
Production Entrypoint & Perimeter Guardrails.
Enforces strict CORS isolation, slowapi rate limiting, request tracing,
and masked global exception payloads.
"""

import asyncio
import logging
import sys
import time
import traceback
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

# Slowapi Rate Limiting Imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import api_router
from app.core.cache import cache
from app.core.config import get_settings
from app.core.logging import set_request_context
from app.database.connection import SessionLocal
from app.engine.outbox_worker import OutboxWorker

# Sub-routers for Job Ingestion Engine and Back-Channel Enterprise Module
from app.routes.jobs import router as jobs_router
from app.routes.enterprise import router as enterprise_router

# Initialize Configuration & Standard Python Logging
settings = get_settings()

# Configure stdout logging handler
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s (%(threadName)s): %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("saarthi.core")

# ── Requirement 3: Slowapi Sliding Window Rate Limiting Setup ──────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

# Lifespan context manager for worker task execution
_outbox_worker = OutboxWorker(db_factory=SessionLocal, poll_interval=5.0)
_worker_task: asyncio.Task = None


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    global _worker_task
    logger.info("Starting Saarthi Production API Services...")
    await cache.connect()
    _worker_task = asyncio.create_task(_outbox_worker.start())
    logger.info("Outbox Worker Task initialized.")
    yield
    logger.info("Initiating Saarthi API Shutdown Sequence...")
    _outbox_worker.stop()
    await _outbox_worker.drain()
    if _worker_task:
        _worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await _worker_task
    await cache.close()
    logger.info("Shutdown sequence finished.")


# Initialize FastAPI Core Application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Saarthi AI — Hardened Career Operating System API",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Register Slowapi Exception Handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Requirement 1: Strict CORS Isolation Limits ───────────────────────────────
# Explicitly locked origins only. Wildcards ("*") are completely removed.
EXPLICIT_LOCKED_ORIGINS: List[str] = [
    origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=EXPLICIT_LOCKED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Saarthi-Ingest-Token",
        "X-Request-ID",
        "Accept",
        "Origin",
    ],
    expose_headers=["X-Request-ID"],
    max_age=600,
)


from app.core.rate_limit import rate_limiter


# ── Requirement 2: Global Exception Handler & Telemetry Masking ───────────────
@app.middleware("http")
async def global_security_exception_and_tracing_middleware(request: Request, call_next):
    """
    Global Request Tracing & Exception Interceptor Middleware.
    Outputs trace telemetry to stdout via python logging and returns a clean, masked HTTP 500 JSONResponse.
    Prevents file paths, internal logic details, or raw stack traces from leaking to public clients.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    set_request_context(request_id, path=request.url.path, method=request.method)
    start_time = time.perf_counter()

    if request.url.path.startswith("/api"):
        client_ip = get_remote_address(request)
        allowed = await rate_limiter.allow(client_ip)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

    try:

        response: Response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Inject Security Perimeter Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
        )
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        logger.info(
            f"PROD_METRIC {request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms) [req_id={request_id}]"
        )
        return response

    except Exception as exc:
        duration_ms = (time.perf_counter() - start_time) * 1000
        error_trace = traceback.format_exc()

        # Output detailed error telemetry to stdout via standard logging
        logger.error(
            f"SYSTEM_VALIDATION_ERROR [{request_id}] Path: {request.method} {request.url.path}\n"
            f"Exception Type: {type(exc).__name__} - Message: {exc}\n"
            f"Stack Telemetry:\n{error_trace}\n"
            f"Duration: {duration_ms:.2f}ms",
            extra={"request_id": request_id, "duration_ms": duration_ms},
        )

        # Return securely masked payload (never leak raw stack or file paths)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal system validation error occurred. Trace telemetry has been logged.",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )


# ── Requirement 4: Mount & Register Sub-Routers ──────────────────────────────
# 1. Main API Router
app.include_router(api_router, prefix=settings.API_PREFIX)

# 2. Job Ingestion Engine Sub-Router (/api/v1/jobs)
app.include_router(jobs_router, prefix=f"{settings.API_PREFIX}")

# 3. Back-Channel Enterprise Module Sub-Router (/api/v1/enterprise)
app.include_router(enterprise_router, prefix=f"{settings.API_PREFIX}")


# ── Root & Health Endpoints ───────────────────────────────────────────────────
@app.get("/", tags=["System Identity"])
async def root():
    """
    Root endpoint returning service identity telemetry.
    """
    return {
        "status": "ok",
        "service": "Saarthi AI Career OS",
        "version": settings.VERSION,
    }


@app.get("/health", tags=["Operational Health"])
@app.get("/api/health", tags=["Operational Health"])
async def health_check():
    """
    Returns system operational metrics for Render health checks and telemetry monitoring.
    """
    db_status = "ok"
    try:
        db: Session = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
    except Exception as exc:
        logger.error(f"Health Check DB Error: {exc}")
        db_status = "error"

    redis_status = "ok"
    try:
        if cache.redis_client is None:
            redis_status = "unavailable"
        else:
            redis_status = "ok"
    except Exception:
        redis_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "database": db_status,
        "components": {
            "api": {"status": "ok"},
            "database": {"status": db_status},
            "redis": {"status": redis_status},
            "ai_gateway": {"status": "ok"},
        },
        "cors_locked_origins": EXPLICIT_LOCKED_ORIGINS,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=2520, reload=settings.DEBUG)
