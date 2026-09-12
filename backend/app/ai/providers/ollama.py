import httpx
import json
import logging
from typing import List, AsyncGenerator
from app.ai.providers.base import BaseProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class OllamaProvider(BaseProvider):
    async def generate_stream(self, messages: List[dict], model: str, **kwargs) -> AsyncGenerator[str, None]:
        settings = get_settings()
        url = settings.OLLAMA_URL.replace("/generate", "/chat")
        payload = {
            "model": model,
            "messages": messages,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    raise Exception(f"Ollama returned {response.status_code}")
                
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            if "message" in chunk:
                                yield chunk["message"]["content"]
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
