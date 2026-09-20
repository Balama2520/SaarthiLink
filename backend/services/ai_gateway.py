"""
AI Gateway Proxy Alias
======================
Re-exports ai_gateway from app.services.ai_gateway.
"""

from app.services.ai_gateway import AIGatewayService, ai_gateway, truncate_chat_context

__all__ = ["AIGatewayService", "ai_gateway", "truncate_chat_context"]
