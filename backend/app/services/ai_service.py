import requests
import httpx
import json
import logging
from typing import List, Generator, AsyncGenerator, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

def generate_response(messages: List[dict], model: str = None) -> str:
    """Non-streaming version for backward compatibility if needed."""
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    try:
        system_prompt = {"role": "system", "content": settings.SYSTEM_PROMPT}
        full_messages = [system_prompt] + messages

        r = requests.post(
            settings.OLLAMA_URL.replace("/generate", "/chat"),
            json={"model": model, "messages": full_messages, "stream": False},
            timeout=120
        )
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "⚠️ Empty response")
    except Exception as e:
        logger.error(f"Ollama generation error: {e}")
        return f"⚠️ Error: {str(e)}"

PERSONALITY_PROMPTS = {
    "default": "You are Saarthi AI, an advanced neural interface developed by Bala Maneesh Ayanala. Be concise, helpful, and futuristic.",
    "secure": "You are Saarthi's Security Core. Focus on safety, encryption, and defensive measures. Be stern and precise.",
    "analyze": "You are Saarthi's Analytic Engine. Focus on data, logic, and deep patterns. Use technical terminology.",
    "experimental": "You are Saarthi's Experimental Neural Link. Be creative, unpredictable, and highly advanced. Think outside the box."
}

async def generate_response_stream_async(
    messages: List[dict], 
    model: str = None, 
    personality: str = "default", 
    image_data: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """Asynchronous streaming version supported multimodal and personas."""
    from app.services.memory_json_service import memory_json_service
    
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    url = settings.OLLAMA_URL.replace("/generate", "/chat")
    
    # Load custom persona from JSON memory if available
    custom_persona = None
    if user_id:
        prefs = memory_json_service.get_user_preferences(user_id)
        custom_persona = prefs.get("custom_persona")

    prompt_text = custom_persona or PERSONALITY_PROMPTS.get(personality, PERSONALITY_PROMPTS["default"])
    system_prompt = {"role": "system", "content": prompt_text}
    
    # Inject image into the last user message if present
    processed_messages = []
    for m in messages:
        processed_messages.append(m.copy())
    
    if image_data and processed_messages and processed_messages[-1]["role"] == "user":
        processed_messages[-1]["images"] = [image_data]

    full_messages = [system_prompt] + processed_messages
    
    payload = {
        "model": model,
        "messages": full_messages,
        "stream": True
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    yield f"⚠️ Ollama Error: {response.status_code}"
                    return

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
    except Exception as e:
        logger.error(f"Ollama stream error: {e}")
        yield f"⚠️ Neural Link Fault: {str(e)}"


def generate_response_stream(messages: List[dict], model: str = None) -> Generator[str, None, None]:
    """Streaming version for real-time interaction (Synchronous)."""
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    try:
        url = settings.OLLAMA_URL.replace("/generate", "/chat")
        system_prompt = {"role": "system", "content": settings.SYSTEM_PROMPT}
        full_messages = [system_prompt] + messages

        with requests.post(
            url,
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
        logger.error(f"Ollama sync stream error: {e}")
        yield f"⚠️ Stream Error: {str(e)}"

