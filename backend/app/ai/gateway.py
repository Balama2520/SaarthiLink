import logging
from typing import List, AsyncGenerator, Optional
from app.ai.router import AIRouter
from app.ai.metrics import metrics_tracker
from app.core.config import get_settings
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)

class AIGateway:
    def __init__(self):
        self.router = AIRouter()

    async def generate_response_stream(
        self,
        messages: List[dict],
        model: str = None,
        image_data: Optional[str] = None,
        personality: str = "default"
    ) -> AsyncGenerator[str, None]:

        settings = get_settings()
        # Load system prompt
        try:
            prompt_text = PromptManager.load(f"system/{personality}")
            if prompt_text.startswith("Error:"):
                prompt_text = PromptManager.load("system/default")
        except Exception:
            prompt_text = PromptManager.load("system/default")

        system_prompt = {"role": "system", "content": prompt_text}

        # Build message list
        processed_messages = [system_prompt]
        for m in messages:
            copy_msg = m.copy()
            if "timestamp" in copy_msg:
                del copy_msg["timestamp"]
            processed_messages.append(copy_msg)

        if image_data and processed_messages and processed_messages[-1]["role"] == "user":
            processed_messages[-1]["images"] = [image_data]

        # Smart routing: prefer Gemini when key is present (Ollama may be offline)
        # Fall back to Ollama only when no Gemini key is configured.
        has_gemini_key = bool(settings.GEMINI_API_KEY)
        primary_name = "gemini" if has_gemini_key else "ollama"
        # Provider model names are not interchangeable (for example, "phi3"
        # is not a Gemini model).  Respect an explicitly requested model only
        # for the local provider; Gemini always uses its server-side setting.
        provider_model = (
            settings.GEMINI_MODEL if primary_name == "gemini" else (model or settings.DEFAULT_MODEL)
        )
        fallback_name = "ollama" if has_gemini_key else None

        primary = self.router.get_provider(primary_name)
        metrics_tracker.record_call()

        try:
            async for chunk in primary.generate_stream(processed_messages, provider_model):
                yield chunk
            return
        except Exception as e:
            logger.warning(f"Primary provider ({primary_name}) failed: {e}")
            metrics_tracker.record_failure()

            if fallback_name:
                fallback = self.router.get_provider(fallback_name)
                logger.warning(f"Falling back to {fallback_name}...")
                try:
                    async for chunk in fallback.generate_stream(processed_messages, model or settings.DEFAULT_MODEL):
                        yield chunk
                except Exception as fe:
                    logger.error(f"Fallback provider ({fallback_name}) failed: {fe}")
                    yield "⚠️ AI temporarily unavailable. Please try again in a moment."
            else:
                yield "⚠️ AI temporarily unavailable. Please try again in a moment."

