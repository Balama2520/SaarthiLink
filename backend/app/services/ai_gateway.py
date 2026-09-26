"""
Resilient Outbound AI Proxy Core (Gemini & Hugging Face Qwen Brain)
====================================================================
Provides asynchronous inference routing to Gemini API & Hugging Face (Qwen2.5-3B-Instruct).
Enforces strict 8.0-second HTTP timeout boundaries and context truncation (last 5 messages).
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger("saarthi.ai_gateway")
settings = get_settings()

# Environment settings
GEMINI_API_KEY = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
HF_API_KEY = getattr(settings, "HF_API_KEY", None) or os.getenv("HF_API_KEY")
HF_MODEL_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-3B-Instruct"

# Rigid Timeout boundary (8 seconds max for outbound AI proxies)
AI_TIMEOUT_SECONDS = 8.0
MAX_CHAT_HISTORY_CONTEXT = 5  # Truncate context to last 5 message pairs


def truncate_chat_context(
    messages: List[Dict[str, str]], max_messages: int = MAX_CHAT_HISTORY_CONTEXT
) -> List[Dict[str, str]]:
    """
    Truncates message array logs to the last `max_messages` items.
    Protects context window from overflow and reduces token processing latency.
    """
    if not messages:
        return []
    # Keep system message if present at index 0, then take the last N user/assistant messages
    if messages[0].get("role") == "system":
        system_msg = messages[0]
        recent_msgs = messages[1:][-max_messages:]
        return [system_msg] + recent_msgs
    return messages[-max_messages:]


class AIGatewayService:
    """
    Stateless proxy core directing requests to Google Gemini & Hugging Face Inference endpoints.
    """

    def __init__(self):
        self.gemini_key = GEMINI_API_KEY
        self.hf_key = HF_API_KEY
        self.timeout = httpx.Timeout(AI_TIMEOUT_SECONDS, connect=3.0)

    async def generate_career_insight(
        self,
        prompt: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        system_instruction: str = "You are Saarthi, an expert Career & Resume Copilot.",
    ) -> Dict[str, Any]:
        """
        Routes generation to primary Hugging Face API (Qwen2.5-3B-Instruct).
        Falls back to Google Gemini if HF is unreachable or times out.
        """
        truncated_history = truncate_chat_context(chat_history or [])

        # 1. Try Hugging Face first (Primary AI Brain)
        try:
            return await self._call_huggingface_qwen(prompt, truncated_history, system_instruction)
        except Exception as exc:
            logger.warning(
                f"Hugging Face Inference invocation failed or timed out: {exc}. Falling back to Gemini."
            )

        # 2. Fallback to Gemini API if configured
        if self.gemini_key:
            try:
                return await self._call_gemini_api(prompt, truncated_history, system_instruction)
            except Exception as exc:
                logger.error(f"Gemini API fallback invocation failed: {exc}")

        # 3. Graceful degraded fallback if all remote providers fail
        return {
            "response": "I am experiencing high traffic right now. Here is a quick strategy: Focus on your core DSA, review resume keywords, and practice star-format interview questions.",
            "provider": "fallback_offline",
            "status": "degraded",
        }

    async def _call_gemini_api(
        self,
        prompt: str,
        chat_history: List[Dict[str, str]],
        system_instruction: str,
    ) -> Dict[str, Any]:
        """
        Executes outbound request to Gemini API endpoint with strict 8.0s timeout.
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"

        contents = []
        if system_instruction:
            contents.append(
                {
                    "role": "user",
                    "parts": [{"text": f"System Instruction: {system_instruction}"}],
                }
            )

        for msg in chat_history:
            role = "user" if msg.get("role") in ("user", "human") else "model"
            contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 800,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Gemini API returned HTTP {resp.status_code}: {resp.text[:200]}"
                )

            data = resp.json()
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

            return {
                "response": text or "No output generated.",
                "provider": "google_gemini",
                "status": "success",
            }

    async def _call_huggingface_qwen(
        self,
        prompt: str,
        chat_history: List[Dict[str, str]],
        system_instruction: str,
    ) -> Dict[str, Any]:
        """
        Executes outbound request to Hugging Face (Qwen2.5-3B-Instruct) with 8.0s timeout.
        """
        headers = {"Content-Type": "application/json"}
        if self.hf_key:
            headers["Authorization"] = f"Bearer {self.hf_key}"

        formatted_messages = f"<|im_start|>system\n{system_instruction}<|im_end|>\n"
        for msg in chat_history:
            role = msg.get("role", "user")
            formatted_messages += f"<|im_start|>{role}\n{msg.get('content', '')}<|im_end|>\n"
        formatted_messages += f"<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n"

        payload = {
            "inputs": formatted_messages,
            "parameters": {
                "max_new_tokens": 512,
                "temperature": 0.5,
                "return_full_text": False,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(HF_MODEL_URL, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"HuggingFace Qwen returned HTTP {resp.status_code}: {resp.text[:200]}"
                )

            data = resp.json()
            generated_text = ""
            if isinstance(data, list) and len(data) > 0:
                generated_text = data[0].get("generated_text", "")
            elif isinstance(data, dict):
                generated_text = data.get("generated_text", "")

            return {
                "response": generated_text.strip() or "Analysis complete.",
                "provider": "huggingface_qwen_2.5_3b",
                "status": "success",
            }


ai_gateway = AIGatewayService()
