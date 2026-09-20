"""
Saarthi AI — Core Application Entrypoint Proxy
==============================================
Imports hardened FastAPI application instance from app.main.
"""

from app.main import app

__all__ = ["app"]
