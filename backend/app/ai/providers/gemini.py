import asyncio
import httpx
import json
import logging
import random
from typing import List, AsyncGenerator
from app.ai.providers.base import BaseProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503}
MAX_RETRIES = 3


class GeminiProvider(BaseProvider):
    async def generate_stream(self, messages: List[dict], model: str, **kwargs) -> AsyncGenerator[str, None]:
        settings = get_settings()
        gemini_key = settings.GEMINI_API_KEY
        if not gemini_key:
            raise Exception("GEMINI_API_KEY not found in environment.")

        gemini_contents = []
        system_instruction = ""

        for m in messages:
            if m.get("role") == "system":
                system_instruction = m.get("content", "")
            else:
                role = "user" if m.get("role") == "user" else "model"
                gemini_contents.append({
                    "role": role,
                    "parts": [{"text": m.get("content", "")}]
                })

        if not gemini_contents:
            raise Exception("No user/assistant messages provided to Gemini (only system message).")

        gemini_model = settings.GEMINI_MODEL or "gemini-2.5-flash"
        gemini_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{gemini_model}:streamGenerateContent?key={gemini_key}&alt=sse"
        )
        logger.info("Gemini request: model=%s, messages=%d", gemini_model, len(gemini_contents))
        payload: dict = {"contents": gemini_contents}
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        # Bounded retry loop for transient provider issues
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    async with client.stream("POST", gemini_url, json=payload) as response:
                        if response.status_code != 200:
                            error_msg = await response.aread()
                            error_str = (
                                error_msg.decode("utf-8", errors="replace")
                                if isinstance(error_msg, bytes)
                                else str(error_msg)
                            )
                            is_retryable = response.status_code in RETRYABLE_STATUS_CODES

                            if is_retryable and attempt < MAX_RETRIES:
                                backoff = (1.5 ** attempt) + random.uniform(0.1, 0.4)
                                logger.warning(
                                    "Gemini returned %d on attempt %d/%d. Retrying in %.2fs...",
                                    response.status_code, attempt, MAX_RETRIES, backoff
                                )
                                await asyncio.sleep(backoff)
                                continue

                            raise Exception(f"Gemini API error {response.status_code}: {error_str[:300]}")

                        # Stream response chunks
                        async for line in response.aiter_lines():
                            line = line.strip()
                            if not line:
                                continue
                            if line.startswith("data:"):
                                line = line[5:].strip()
                            if not line or line == "[DONE]":
                                continue
                            try:
                                chunk = json.loads(line)
                                candidates = chunk.get("candidates", [])
                                if candidates:
                                    parts = (
                                        candidates[0]
                                        .get("content", {})
                                        .get("parts", [])
                                    )
                                    for part in parts:
                                        text = part.get("text", "")
                                        if text:
                                            yield text
                            except json.JSONDecodeError:
                                continue
                        return  # Succeeded and finished streaming

            except httpx.RequestError as net_err:
                last_error = net_err
                if attempt < MAX_RETRIES:
                    backoff = (1.5 ** attempt) + random.uniform(0.1, 0.3)
                    logger.warning("Network error calling Gemini: %s. Retrying in %.2fs...", net_err, backoff)
                    await asyncio.sleep(backoff)
                else:
                    raise Exception(f"Gemini network error after {MAX_RETRIES} attempts: {last_error}")
            except Exception as e:
                last_error = e
                # Non-retryable error or exhausted retries
                raise last_error
