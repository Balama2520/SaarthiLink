import requests
import json
from typing import List, Generator
from app.config import get_settings

def generate_response(messages: List[dict], model: str = None) -> str:
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    """Non-streaming version for backward compatibility if needed."""
    try:
        system_prompt = {"role": "system", "content": settings.SYSTEM_PROMPT}
        full_messages = [system_prompt] + messages

        r = requests.post(
            settings.OLLAMA_URL,
            json={"model": model, "messages": full_messages, "stream": False},
            timeout=120
        )
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "⚠️ Empty response")
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

def generate_response_stream(messages: List[dict], model: str = None) -> Generator[str, None, None]:
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    """Streaming version for real-time interaction."""
    try:
        system_prompt = {"role": "system", "content": settings.SYSTEM_PROMPT}
        full_messages = [system_prompt] + messages

        with requests.post(
            settings.OLLAMA_URL,
            json={"model": model, "messages": full_messages, "stream": True},
            stream=True,
            timeout=120
        ) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line:
                    chunk = json.loads(line)
                    if "message" in chunk:
                        yield chunk["message"]["content"]
                    if chunk.get("done"):
                        break
    except Exception as e:
        yield f"⚠️ Stream Error: {str(e)}"
