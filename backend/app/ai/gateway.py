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
            try:
                async for chunk in provider.generate_stream(processed_messages, provider_model):
                    yield chunk
                return
            except Exception as error:
                logger.warning("AI provider (%s) failed: %s", provider_name, error)
                metrics_tracker.record_failure()

        logger.error("All configured AI providers failed")
        yield "AI is temporarily unavailable. Please check the provider configuration and try again."
