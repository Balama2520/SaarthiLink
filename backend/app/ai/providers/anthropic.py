from typing import List, AsyncGenerator
from app.ai.providers.base import BaseProvider


class AnthropicProvider(BaseProvider):
    async def generate_stream(
        self, messages: List[dict], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        yield "Anthropic provider is not yet fully implemented."
