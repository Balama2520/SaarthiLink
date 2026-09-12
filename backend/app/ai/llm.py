import logging
from typing import List, AsyncGenerator, Optional

logger = logging.getLogger(__name__)


async def generate_response_stream_async(
    messages: List[dict],
    model: str = None,
    personality: str = "default",
    image_data: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Legacy bridge: delegates to AIGateway.
    Kept for backward compatibility with any code that still imports from app.ai.llm.
    """
    from app.ai.gateway import AIGateway
    async for chunk in AIGateway().generate_response_stream(
        messages, model=model, image_data=image_data, personality=personality
    ):
        yield chunk
