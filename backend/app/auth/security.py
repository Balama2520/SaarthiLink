"""
Token Verification & Identity Isolation Guard (Anti-IDOR Security Core)
=======================================================================
Provides Supabase GoTrue JWT HS256 validation & strict anti-IDOR resource ownership guards.
"""

import logging
import os
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

logger = logging.getLogger("saarthi.security")
settings = get_settings()

security_bearer = HTTPBearer(auto_error=False)

# Retrieve secret keys with robust fallback
SUPABASE_JWT_SECRET = (
    getattr(settings, "SUPABASE_JWT_SECRET", None)
    or getattr(settings, "JWT_SECRET", None)
    or os.getenv("SUPABASE_JWT_SECRET")
    or os.getenv("JWT_SECRET")
    or "saarthi-production-jwt-secret-key-2026"
)

ALGORITHM = "HS256"


class AuthenticatedUser:
    """Represents a validated user extracted from Supabase GoTrue JWT token."""

    def __init__(
        self,
        user_id: str,
        email: Optional[str] = None,
        role: str = "authenticated",
        user_metadata: Optional[Dict[str, Any]] = None,
    ):
        self.id = user_id
        self.email = email
        self.role = role
        self.metadata = user_metadata or {}

    def is_admin(self) -> bool:
        return self.role in ("admin", "service_role", "superuser")


def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase GoTrue Bearer JWT token locally using HS256.
    Raises HTTPException(401) on expiration or invalid signature.
    """
    try:
        # Supabase GoTrue issues tokens signed with HS256 and verified using SUPABASE_JWT_SECRET
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )

        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            logger.warning("JWT Token decoding failed: missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject identity",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload

    except JWTError as exc:
        logger.warning(f"JWT Verification failure: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> AuthenticatedUser:
    """
    FastAPI Dependency to authenticate incoming HTTP Requests via Bearer token.
    Returns AuthenticatedUser or raises HTTP 401.
    """
    if not auth or not auth.credentials:
        # Guest mode fallback if allowed in non-strict endpoints
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_supabase_jwt(auth.credentials)
    user_id = payload.get("sub") or payload.get("user_id")
    email = payload.get("email")
    role = payload.get("role", "authenticated")
    user_metadata = payload.get("user_metadata", {})

    return AuthenticatedUser(
        user_id=str(user_id),
        email=email,
        role=role,
        user_metadata=user_metadata,
    )


# ── Anti-IDOR Security Enforcers ───────────────────────────────────────────────


def enforce_resource_ownership(
    requested_user_id: str,
    current_user: AuthenticatedUser,
    resource_name: str = "resource",
) -> None:
    """
    Anti-IDOR Structural Check Function.
    Cross-references the validated token user ID against requested record parameters.
    Prevents User A from viewing/editing User B's profile, resume, or applications.
    """
    if not current_user or not current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthenticated access attempt.",
        )

    # Admins bypass IDOR checks for support operations
    if current_user.is_admin():
        return

    if str(current_user.id).strip().lower() != str(requested_user_id).strip().lower():
        logger.warning(
            f"IDOR PREVENTED: User [{current_user.id}] attempted unauthorized access to {resource_name} belonging to User [{requested_user_id}]"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You do not have permission to access or modify this {resource_name}.",
        )


def verify_storage_path_ownership(
    storage_path: str,
    current_user: AuthenticatedUser,
) -> None:
    """
    Anti-IDOR Check for Supabase Storage File Paths (e.g. 'resumes/{user_id}/cv.pdf').
    Ensures users can only upload/download files within their own allocated storage prefix.
    """
    if current_user.is_admin():
        return

    clean_path = storage_path.lstrip("/")
    expected_prefix = f"resumes/{current_user.id}"
    user_prefix = f"{current_user.id}/"

    if not (
        clean_path.startswith(expected_prefix)
        or clean_path.startswith(user_prefix)
        or f"/{current_user.id}/" in clean_path
    ):
        logger.warning(
            f"IDOR STORAGE PREVENTED: User [{current_user.id}] attempted file access on path [{storage_path}]"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot access storage paths assigned to another candidate.",
        )
