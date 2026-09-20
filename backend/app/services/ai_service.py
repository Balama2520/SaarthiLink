import logging
from typing import List, AsyncGenerator, Optional

logger = logging.getLogger(__name__)


async def generate_response_stream_async(
    messages: List[dict],
    model: str = None,
    personality: str = "default",
    image_data: Optional[str] = None,
    user_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Asynchronous streaming version routing to the AIGateway."""
    from app.ai.gateway import AIGateway

    async for chunk in AIGateway().generate_response_stream(
        messages=messages, model=model, personality=personality, image_data=image_data
    ):
        yield chunk
