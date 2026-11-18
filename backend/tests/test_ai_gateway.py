import pytest

from app.ai.gateway import AIGateway, AIProviderUnavailable
from app.core.config import get_settings


class FailingProvider:
    async def generate_stream(self, _messages, _model):
        raise RuntimeError("provider unavailable")
        yield ""


class SuccessfulProvider:
    async def generate_stream(self, _messages, _model):
        yield "Career"
        yield " guidance"


class _FakeRouter:
    def __init__(self, provider):
        self.provider = provider

    def get_provider(self, _name):
        return self.provider


@pytest.mark.asyncio
@pytest.mark.live_ai
async def test_gateway_raises_when_all_providers_fail(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr("app.ai.gateway.AIRouter", lambda: _FakeRouter(FailingProvider()))
    gateway = AIGateway()

    with pytest.raises(AIProviderUnavailable):
        async for _chunk in gateway.generate_response_stream(
            [{"role": "user", "content": "Help me plan"}]
        ):
            pass


@pytest.mark.asyncio
@pytest.mark.live_ai
async def test_gateway_returns_real_provider_content(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr("app.ai.gateway.AIRouter", lambda: _FakeRouter(SuccessfulProvider()))
    gateway = AIGateway()

    chunks = [
        chunk
        async for chunk in gateway.generate_response_stream(
            [{"role": "user", "content": "Help me plan"}]
        )
    ]
    assert "".join(chunks) == "Career guidance"


def test_streaming_chat_reports_provider_failure_as_service_unavailable(client, monkeypatch):
    async def unavailable_stream(*_args, **_kwargs):
        raise AIProviderUnavailable("provider down")
        yield ""

    monkeypatch.setattr(AIGateway, "generate_response_stream", unavailable_stream)
    response = client.post(
        "/api/chat/local",
        json={"message": "Help me prepare for an interview"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "AI Coach is temporarily unavailable. Please try again shortly."
    )


def test_ai_router_cloud_production_never_defaults_to_ollama(monkeypatch):
    from app.ai.router import AIRouter
    settings = get_settings()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")

    router = AIRouter()
    provider = router.get_provider(preferred="ollama")
    assert isinstance(provider, router.gemini.__class__)


def test_ai_router_fallback_chain(monkeypatch):
    from app.ai.router import AIRouter
    settings = get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")

    router = AIRouter()
    fb = router.get_fallback_provider("ollama")
    assert isinstance(fb, router.gemini.__class__)

    fb_hf = router.get_fallback_provider("gemini")
    assert isinstance(fb_hf, router.huggingface.__class__)

