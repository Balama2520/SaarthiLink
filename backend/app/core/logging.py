"""
Saarthi AI - Structured JSON Logging with standard Python logging.
Replaces structlog. Propagates request_id via contextvars.
"""

import logging
import json
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict

# ── Context Variables ─────────────────────────────────────────────────────────
_request_id_var: ContextVar[str] = ContextVar("request_id", default="")
_path_var: ContextVar[str] = ContextVar("path", default="")
_method_var: ContextVar[str] = ContextVar("method", default="")


def set_request_context(request_id: str, path: str = "", method: str = "") -> None:
    _request_id_var.set(request_id)
    _path_var.set(path)
    _method_var.set(method)


def get_request_id() -> str:
    return _request_id_var.get() or ""


# ── JSON Formatter ────────────────────────────────────────────────────────────
class JSONFormatter(logging.Formatter):
    """Outputs each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Propagate request context if available
        request_id = get_request_id()
        if request_id:
            log_obj["request_id"] = request_id
        path = _path_var.get()
        if path:
            log_obj["path"] = path
        method = _method_var.get()
        if method:
            log_obj["method"] = method

        # Extra fields passed via logger.info("msg", extra={...})
        for key, val in record.__dict__.items():
            if key not in (
                "message",
                "asctime",
                "args",
                "created",
                "exc_info",
                "exc_text",
                "filename",
                "funcName",
                "id",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "msg",
                "name",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "thread",
                "threadName",
                "taskName",
            ):
                log_obj[key] = val

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, default=str)


class PrettyFormatter(logging.Formatter):
    """Human-readable colored formatter for development."""

    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        request_id = get_request_id()
        rid_part = f" [{request_id[:8]}]" if request_id else ""
        msg = record.getMessage()
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
        return f"{color}{ts}{rid_part} {record.levelname:<8}{self.RESET} {record.name} | {msg}"


def setup_logging(is_production: bool = True) -> None:
    """
    Configure root logger.
    - Production: JSON to stdout.
    - Development: pretty colored console.
    """
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter() if is_production else PrettyFormatter())

    root = logging.getLogger()
    # Remove any existing handlers (e.g., from structlog)
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Reduce noise from chatty libraries
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
