import logging
from typing import List, AsyncGenerator, Optional
from app.ai.router import AIRouter
from app.ai.metrics import metrics_tracker
from app.core.config import get_settings
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


class AIProviderUnavailable(RuntimeError):
    """Raised when no configured AI provider can produce a response."""


async def first_response_chunk(stream: AsyncGenerator[str, None]) -> str:
    """Prime a provider stream so setup failures can become an HTTP error."""
    try:
        return await anext(stream)
    except StopAsyncIteration as error:
        raise AIProviderUnavailable("AI provider returned an empty response") from error


class AIGateway:
    def __init__(self):
        self.router = AIRouter()

    async def generate_response_stream(
        self,
        messages: List[dict],
        model: str = None,
        image_data: Optional[str] = None,
        personality: str = "default",
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

        # Always prioritize Hugging Face as the primary AI Brain, followed by Gemini & Ollama
        has_gemini_key = bool(settings.GEMINI_API_KEY)

        providers = [("huggingface", model or settings.DEFAULT_MODEL)]
        if has_gemini_key:
            providers.append(("gemini", settings.GEMINI_MODEL))
        providers.append(("ollama", model or settings.DEFAULT_MODEL))

        metrics_tracker.record_call()
        for provider_name, provider_model in providers:
            provider = self.router.get_provider(provider_name)
            received_content = False
            try:
                async for chunk in provider.generate_stream(processed_messages, provider_model):
                    if chunk and chunk.strip():
                        received_content = True
                    yield chunk
                if not received_content:
                    raise RuntimeError("AI provider returned an empty response")
                metrics_tracker.record_success(provider_name)
                return
            except Exception as error:
                logger.warning("AI provider (%s) failed: %s", provider_name, error)
                metrics_tracker.record_failure(provider_name)

        logger.error("All configured AI providers failed")
        metrics_tracker.record_unavailable()
        raise AIProviderUnavailable("All configured AI providers failed")
