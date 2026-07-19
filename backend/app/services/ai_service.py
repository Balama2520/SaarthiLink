import logging
from typing import List, AsyncGenerator, Optional
from app.ai import generate_response_stream_async as _generate_stream

logger = logging.getLogger(__name__)

async def generate_response_stream_async(
    messages: List[dict], 
    model: str = None, 
    personality: str = "default", 
    image_data: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """Asynchronous streaming version routing to the unified AI module."""
    async for chunk in _generate_stream(
        messages=messages,
        model=model,
        personality=personality,
        image_data=image_data,
        user_id=user_id
    ):
        yield chunk
