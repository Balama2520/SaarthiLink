import logging
from app.ai.providers.ollama import OllamaProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.huggingface import HuggingFaceSaarthiBrain

logger = logging.getLogger(__name__)

class AIRouter:
    def __init__(self):
        self.ollama = OllamaProvider()
        self.gemini = GeminiProvider()
        self.huggingface = HuggingFaceSaarthiBrain()

    def get_provider(self, preferred: str = "ollama"):
        """Return the requested provider. Falls back to Gemini for unknown names."""
        if preferred == "gemini":
            return self.gemini
        if preferred == "huggingface":
            return self.huggingface
        return self.ollama

    def get_fallback_provider(self, current: str):
        if current == "ollama":
            return self.gemini
        if current == "huggingface":
            return self.gemini   # Fall back to Gemini if HF is unavailable
        return None
