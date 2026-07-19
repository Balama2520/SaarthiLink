import httpx
import json
import logging
import os
from typing import List, AsyncGenerator, Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

PERSONALITY_PROMPTS = {
    "default": "You are Saarthi AI, a career copilot for Indian students and freshers developed by Bala Maneesh Ayanala. Help with career questions, tech learning, resume tips, and job preparation. Be concise, practical, and encouraging.",
    "career": "You are Saarthi's Career Coach. Specialize in resume reviews, ATS optimization, job search strategy, and LinkedIn profiles. Give direct, actionable advice tailored to the Indian job market.",
    "interview": "You are Saarthi's Interview Coach. Help users prepare for technical and behavioral interviews. Give example answers, common questions for their target role, and confidence-building tips.",
    "learning": "You are Saarthi's Learning Coach. Help users build structured learning roadmaps for any tech skill. Suggest free resources, projects, and milestones. Keep it practical and achievable.",
}

async def generate_response_stream_async(
    messages: List[dict],
    model: str = None,
    personality: str = "default",
    image_data: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Generate LLM response stream.
    First tries Ollama. If Ollama is offline/fails, it falls back to Gemini API (if GEMINI_API_KEY is configured).
    """
    settings = get_settings()
    model = model or settings.DEFAULT_MODEL
    
    # 1. Resolve prompt
    prompt_text = PERSONALITY_PROMPTS.get(personality, PERSONALITY_PROMPTS["default"])
    system_prompt = {"role": "system", "content": prompt_text}
    
    processed_messages = [system_prompt]
    for m in messages:
        copy_msg = m.copy()
        # Remove DB specific fields if any
        if "timestamp" in copy_msg:
            del copy_msg["timestamp"]
        processed_messages.append(copy_msg)
        
    # Inject image into the last user message if present
    if image_data and processed_messages and processed_messages[-1]["role"] == "user":
        processed_messages[-1]["images"] = [image_data]

    # Try Ollama first
    ollama_success = False
    try:
        url = settings.OLLAMA_URL.replace("/generate", "/chat")
        payload = {
            "model": model,
            "messages": processed_messages,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code == 200:
                    ollama_success = True
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
        logger.warning(f"Ollama stream failed/offline: {e}. Attempting fallback to Gemini API...")

    if not ollama_success:
        # Fallback to Gemini REST API
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            yield "⚠️ AI Offline: Ollama is unavailable, and GEMINI_API_KEY is not configured in the environment."
            return
        
        # Translate message format for Gemini
        # Gemini format: {"role": "user"|"model", "parts": [{"text": "..."}]}
        gemini_contents = []
        
        # Inject system prompt into instructions
        system_instruction = prompt_text
        
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            gemini_contents.append({
                "role": role,
                "parts": [{"text": m["content"]}]
            })
            
        try:
            # We use gemini-1.5-flash as the fallback model
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={gemini_key}"
            
            payload = {
                "contents": gemini_contents,
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                }
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", gemini_url, json=payload) as response:
                    if response.status_code != 200:
                        yield f"⚠️ Gemini Fallback Error (HTTP {response.status_code})"
                        return
                    
                    # Gemini returns streamed JSON chunks
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        # Remove leading commas or packaging if any, Gemini sends SSE format or json stream
                        line_clean = line.strip()
                        if line_clean.startswith("[") or line_clean.startswith("]") or line_clean.startswith(","):
                            line_clean = line_clean.lstrip(",[] ")
                        if not line_clean:
                            continue
                        try:
                            chunk = json.loads(line_clean)
                            candidates = chunk.get("candidates", [])
                            if candidates:
                                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                if text:
                                    yield text
                        except Exception:
                            continue
        except Exception as e:
            logger.error(f"Gemini API fallback error: {e}")
            yield f"⚠️ Neural Link Fail: Both Ollama and Gemini fallback failed. Error: {str(e)}"
