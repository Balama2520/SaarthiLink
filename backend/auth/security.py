"""
Auth Security Proxy Module
==========================
Exposes security dependencies from app.auth.security.
"""

from app.auth.security import (
    AuthenticatedUser,
    decode_supabase_jwt,
    enforce_resource_ownership,
    get_current_user,
    verify_storage_path_ownership,
)

__all__ = [
    "decode_supabase_jwt",
    "get_current_user",
    "enforce_resource_ownership",
    "verify_storage_path_ownership",
    "AuthenticatedUser",
]
