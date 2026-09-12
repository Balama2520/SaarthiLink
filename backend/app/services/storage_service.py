"""
Supabase Storage-backed file service for resume uploads.

Principles:
- PostgreSQL is the source of truth for metadata (Resume table).
- Supabase Storage is the permanent home for the raw file bytes.
- Storage is OPTIONAL: when SUPABASE_URL / SERVICE_ROLE_KEY are missing,
  the upload still succeeds at the metadata+DB level, with raw_text
  preserved and file_path left empty. The uploader can retry later.
- Bucket must be PRIVATE. We never expose public URLs or the service-role key
  to the browser. If we ever need to serve a file, we proxy-download through
  the backend (authenticated endpoint) or generate a short-lived signed URL.
- We never write permanent files to the backend filesystem. All file bytes
  flow through memory only.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class StorageResult:
    success: bool
    storage_path: str  # bucket-relative object path, e.g. "resumes/user-42/resume-uuid.pdf"
    reference: str  # opaque reference stored in Resume.file_path (never a local fs path)
    error: Optional[str] = None


class SupabaseStorageService:
    """Thin wrapper around supabase-py storage with graceful degradation."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        url = (self.settings.SUPABASE_URL or "").strip()
        key = (self.settings.SUPABASE_SERVICE_ROLE_KEY or "").strip()
        bucket = (self.settings.STORAGE_BUCKET or "resumes").strip()

        if not url or not key:
            logger.warning(
                "Supabase Storage disabled: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY "
                "missing. Resume bytes will not be persisted to object storage; "
                "only extracted raw_text + DB metadata will be saved."
            )
            self._client = None
            return

        try:
            from supabase import create_client, Client
            self._client: Optional[Client] = create_client(url, key)
            # Ensure bucket reference is known; we don't auto-create the bucket
            # because that's an admin step the operator does via Supabase dashboard.
            self._bucket = bucket
            logger.info("Supabase Storage client initialized. Bucket='%s'", bucket)
        except Exception as exc:  # pragma: no cover - network at startup
            logger.error("Failed to init Supabase Storage client: %s", exc)
            self._client = None

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def _object_key(self, user_id: int, resume_id: str, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower() or ".bin"
        # PRIVATE bucket layout: bucket/resumes/<user_id>/<resume_id><ext>
        return f"resumes/user-{user_id}/{resume_id}{ext}"

    async def upload_resume(
        self,
        *,
        user_id: int,
        resume_id: str,
        filename: str,
        content_type: str,
        file_bytes: bytes,
    ) -> StorageResult:
        """
        Upload raw resume bytes to the PRIVATE Supabase storage bucket.

        On failure (missing client, network, permission), returns a
        non-success StorageResult but NEVER raises. The Resume row is
        always persisted; file_path will be empty if upload failed.
        """
        if not self.is_configured:
            return StorageResult(
                success=False,
                storage_path="",
                reference="",
                error="supabase-storage-not-configured",
            )

        object_key = self._object_key(user_id, resume_id, filename)
        try:
            # supabase-py storage: upload(file_options={...}) -> PostgrestAPIResponse
            # file_options={"cacheControl": "...", "contentType": "...", "upsert": bool}
            client = self._client.storage.from_(self._bucket)

            # The `upload` call signature differs by library version; keep it tolerant.
            try:
                upload_kwargs = {
                    "file_options": {
                        "contentType": content_type or "application/octet-stream",
                        "cacheControl": "3600",
                        "upsert": "true",
                    }
                }
                res = client.upload(object_key, file_bytes, **upload_kwargs)
            except TypeError:
                # Older supabase-py versions have different kwargs
                res = client.upload(object_key, file_bytes)

            # Many versions return a requests.Response or dict-like
            ok = getattr(res, "status_code", 200) < 300 if hasattr(res, "status_code") else True
            if not ok:
                text = getattr(res, "text", str(res))[:200]
                raise RuntimeError(f"storage upload returned non-2xx: {text}")

            # Reference stored in DB: bucket + key so the backend can fetch later.
            reference = f"supabase://{self._bucket}/{object_key}"
            logger.info(
                "Resume stored in Supabase Storage: user_id=%s resume_id=%s size=%dB",
                user_id, resume_id, len(file_bytes),
            )
            return StorageResult(success=True, storage_path=object_key, reference=reference)
        except Exception as exc:
            logger.warning(
                "Supabase Storage upload failed (non-fatal); Resume DB row still saved. "
                "user_id=%s resume_id=%s error=%s",
                user_id, resume_id, exc,
            )
            return StorageResult(
                success=False,
                storage_path="",
                reference="",
                error=str(exc)[:200],
            )

    async def download_resume(self, *, storage_reference: str) -> Optional[bytes]:
        """
        Download raw bytes for a previously-uploaded resume.

        Returns `None` when:
          - storage is not configured
          - reference is malformed
          - download fails (logged)

        Intended for backend-side proxy downloading only.
        """
        if not self.is_configured or not storage_reference.startswith("supabase://"):
            return None

        try:
            without_scheme = storage_reference[len("supabase://"):]
            bucket, _, key = without_scheme.partition("/")
            client = self._client.storage.from_(bucket)
            data = client.download(key)
            if isinstance(data, bytes):
                return data
            return bytes(data) if data else None
        except Exception as exc:
            logger.error("Failed to download resume from storage: ref=%s err=%s", storage_reference, exc)
            return None


# ── Singleton with lazy import ─────────────────────────────────────────────────
_storage_service: Optional[SupabaseStorageService] = None


def get_storage_service() -> SupabaseStorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service
