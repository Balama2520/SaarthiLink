import os
import logging
from app.ai.providers.ollama import OllamaProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.huggingface import HuggingFaceSaarthiBrain
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AIRouter:
    def __init__(self):
        self.ollama = OllamaProvider()
        self.gemini = GeminiProvider()
        self.huggingface = HuggingFaceSaarthiBrain()

    def get_provider(self, preferred: str = None):
        """Return the requested provider with cloud production awareness."""
        settings = get_settings()
        if not preferred:
            preferred = getattr(settings, "DEFAULT_AI_PROVIDER", "gemini")

        # In cloud / production deployments, never default to localhost Ollama
        is_cloud_prod = settings.ENVIRONMENT == "production" or bool(os.getenv("RENDER"))
        if is_cloud_prod and preferred == "ollama":
            preferred = "gemini" if settings.GEMINI_API_KEY else "huggingface"

        if preferred == "gemini":
            return self.gemini
        if preferred == "huggingface":
            return self.huggingface
        if preferred == "ollama":
            return self.ollama
        return self.gemini if settings.GEMINI_API_KEY else self.huggingface

    def get_fallback_provider(self, current: str):
        settings = get_settings()
        if current == "ollama":
            return self.gemini if settings.GEMINI_API_KEY else self.huggingface
        if current == "huggingface":
            return self.gemini if settings.GEMINI_API_KEY else None
        if current == "gemini":
            return self.huggingface
        return None
