from typing import List, AsyncGenerator
from app.ai.providers.base import BaseProvider


class OpenAIProvider(BaseProvider):
    async def generate_stream(
        self, messages: List[dict], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        yield "OpenAI provider is not yet fully implemented."
