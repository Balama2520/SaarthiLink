"""
HuggingFace Saarthi Brain Provider
===================================
Proxies requests to the Balamaneesh2520/saarthi-ai-brain Gradio Space.

The Space exposes a /generate endpoint (fn_index=0) via the Gradio REST API:
  POST https://<space>.hf.space/run/predict
  Body: {"data": [prompt, null], "fn_index": 0}

This provider is a BACKEND-ONLY adapter — credentials/URLs never reach
the browser. If the Space is unavailable or not configured, the gateway
falls back to the Gemini provider.

Status values reported in /api/health:
  connected       - Space responded successfully
  config_required - HF_SPACE_ID not set
  unavailable     - Space unreachable / timeout
  error           - Unexpected response from Space
"""
import asyncio
import json
import logging
import random
from typing import AsyncGenerator, List, Optional

import httpx

from app.ai.providers.base import BaseProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 60.0  # HF Spaces can be slow to cold-start


class HuggingFaceSaarthiBrain(BaseProvider):
    """
    Provider adapter for the Balamaneesh2520/saarthi-ai-brain Gradio Space.

    Uses the Gradio HTTP REST protocol directly (no gradio_client dependency)
    so we can stream tokens progressively using the SSE endpoint or fall back
    to the synchronous predict endpoint.
    """

    def _get_space_base_url(self) -> Optional[str]:
        settings = get_settings()
        space_id: str = getattr(settings, "HF_SPACE_ID", "") or ""
        if not space_id:
            return None
        # Convert "Owner/space-name" → "owner-space-name.hf.space"
        slug = space_id.lower().replace("/", "-").replace("_", "-")
        return f"https://{slug}.hf.space"

    def _get_hf_token(self) -> Optional[str]:
        settings = get_settings()
        return getattr(settings, "HF_API_TOKEN", "") or None

    def is_configured(self) -> bool:
        return self._get_space_base_url() is not None

    async def health_check(self) -> dict:
        """Return {"status": ..., "latency_ms": ..., "url": ...} — no secrets."""
        base_url = self._get_space_base_url()
        if not base_url:
            return {"status": "config_required", "detail": "HF_SPACE_ID not configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                t0 = asyncio.get_event_loop().time()
                r = await client.get(f"{base_url}/")
                latency_ms = round((asyncio.get_event_loop().time() - t0) * 1000, 1)
                if r.status_code < 500:
                    return {"status": "connected", "latency_ms": latency_ms}
                return {"status": "error", "http_status": r.status_code}
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            return {"status": "unavailable", "detail": str(e)[:120]}
        except Exception as e:
            return {"status": "error", "detail": str(e)[:120]}

    async def generate(self, prompt: str, file_path: Optional[str] = None) -> str:
        """
        Non-streaming call to /generate (fn_index=0).
        Returns the full AI response string.
        Raises on unrecoverable failure.
        """
        base_url = self._get_space_base_url()
        if not base_url:
            raise RuntimeError("HuggingFace Space not configured (HF_SPACE_ID missing)")

        headers: dict = {"Content-Type": "application/json"}
        hf_token = self._get_hf_token()
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"

        payload = {
            "data": [prompt, file_path],
            "fn_index": 0,
        }

        last_error: Optional[Exception] = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                    resp = await client.post(
                        f"{base_url}/run/predict",
                        json=payload,
                        headers=headers,
                    )

                    if resp.status_code == 200:
                        body = resp.json()
                        # Gradio returns {"data": [...], "duration": ..., ...}
                        data = body.get("data", [])
                        if data:
                            result = data[0]
                            return str(result) if result is not None else ""
                        raise RuntimeError("Empty data array from Gradio Space")

                    is_retryable = resp.status_code in RETRYABLE_STATUS_CODES
                    error_text = resp.text[:200]

                    if resp.status_code in (401, 403):
                        logger.error(
                            "HF Space auth failure (status %d) — check HF_API_TOKEN",
                            resp.status_code,
                        )
                        raise PermissionError(
                            f"HF Space returned {resp.status_code} — "
                            "check HF_API_TOKEN or Space visibility"
                        )

                    if is_retryable and attempt < MAX_RETRIES:
                        backoff = (1.5 ** attempt) + random.uniform(0.1, 0.4)
                        logger.warning(
                            "HF Space returned %d on attempt %d/%d — retrying in %.1fs",
                            resp.status_code, attempt, MAX_RETRIES, backoff,
                        )
                        await asyncio.sleep(backoff)
                        continue

                    raise RuntimeError(
                        f"HF Space returned HTTP {resp.status_code}: {error_text}"
                    )

            except (PermissionError, RuntimeError):
                raise
            except (httpx.TimeoutException, httpx.ConnectError) as net_err:
                last_error = net_err
                if attempt < MAX_RETRIES:
                    backoff = (1.5 ** attempt) + random.uniform(0.1, 0.3)
                    logger.warning(
                        "HF Space network error on attempt %d/%d: %s — retrying in %.1fs",
                        attempt, MAX_RETRIES, net_err, backoff,
                    )
                    await asyncio.sleep(backoff)
                else:
                    raise RuntimeError(
                        f"HF Space unreachable after {MAX_RETRIES} attempts: {last_error}"
                    ) from last_error
            except Exception as e:
                raise RuntimeError(f"HF Space unexpected error: {e}") from e

        raise RuntimeError("HF Space exhausted all retries")

    async def generate_stream(
        self, messages: List[dict], model: str = None, **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Streaming adapter: extract last user message as prompt, call generate(),
        yield the full response as a single chunk (HF Space doesn't stream).
        This matches the BaseProvider.generate_stream interface.
        """
        # Build a single prompt from the message list (exclude system messages)
        prompt_parts: list[str] = []
        for m in messages:
            role = m.get("role", "")
            content = m.get("content", "")
            if role == "system":
                # Prepend system context
                prompt_parts.insert(0, f"[Context: {content}]")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Saarthi: {content}")

        prompt = "\n".join(prompt_parts)
        file_path = kwargs.get("file_path", None)

        try:
            result = await self.generate(prompt, file_path=file_path)
            yield result
        except RuntimeError as e:
            # Surface the error as a visible message (gateway will log failure)
            raise
