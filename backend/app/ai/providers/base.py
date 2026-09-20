from abc import ABC, abstractmethod
from typing import List, AsyncGenerator


class BaseProvider(ABC):
    @abstractmethod
    async def generate_stream(
        self, messages: List[dict], model: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        pass
