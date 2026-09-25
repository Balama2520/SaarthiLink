"""
AI response processing and streaming utilities.
"""

import json
from typing import AsyncGenerator, Dict, Any


async def collect_stream(stream: AsyncGenerator[str, None]) -> str:
    """Collect all chunks from an async generator stream into a single string."""
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return "".join(chunks)


def strip_markdown_json(text: str) -> str:
    """Strip markdown code fence wrappers from a JSON string."""
    clean = text.strip()
    for prefix in ("```json", "```"):
        if clean.startswith(prefix):
            clean = clean[len(prefix) :]
            break
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


def parse_json_response(text: str) -> Dict[str, Any]:
    """Parse a JSON object even when the model adds prose or code fences."""
    clean = strip_markdown_json(text)
    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        start = clean.find("{")
        if start < 0:
            raise
        parsed, _ = json.JSONDecoder().raw_decode(clean[start:])

    if not isinstance(parsed, dict):
        raise json.JSONDecodeError("AI response was not a JSON object", clean, 0)
    return parsed
