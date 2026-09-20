"""
Jobs Router Alias
=================
Re-exports routes from app.routes.jobs.
"""

from app.routes.jobs import router

__all__ = ["router"]
