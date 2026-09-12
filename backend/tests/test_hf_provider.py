"""
Tests for the HuggingFace Saarthi Brain provider.

All tests use mocked HTTP responses — the live HF Space is NEVER called,
so the test suite passes regardless of HF availability.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.ai.providers.huggingface import HuggingFaceSaarthiBrain


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_provider(space_id: str = "Balamaneesh2520/saarthi-ai-brain", token: str = "") -> HuggingFaceSaarthiBrain:
    """Return a provider with env vars patched to the given values."""
    provider = HuggingFaceSaarthiBrain()
    # Patch the config lookup so these tests are env-independent
    from unittest.mock import patch as _patch
    return provider


def _mock_settings(space_id: str = "Balamaneesh2520/saarthi-ai-brain", token: str = ""):
    mock = MagicMock()
    mock.HF_SPACE_ID = space_id
    mock.HF_API_TOKEN = token
    return mock


# ---------------------------------------------------------------------------
# 1. Configuration checks
# ---------------------------------------------------------------------------

class TestHFProviderConfiguration:

    def test_is_configured_with_space_id(self):
        """Provider reports configured when HF_SPACE_ID is set."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")):
            assert provider.is_configured() is True

    def test_is_not_configured_without_space_id(self):
        """Provider reports not-configured when HF_SPACE_ID is empty."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("")):
            assert provider.is_configured() is False

    def test_space_url_slug_conversion(self):
        """Space ID 'Owner/space-name' converts correctly to URL slug."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")):
            url = provider._get_space_base_url()
            assert url == "https://balamaneesh2520-saarthi-ai-brain.hf.space"

    def test_no_space_id_returns_none_url(self):
        """Empty HF_SPACE_ID returns None from _get_space_base_url."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("")):
            assert provider._get_space_base_url() is None


# ---------------------------------------------------------------------------
# 2. generate() — success path
# ---------------------------------------------------------------------------

class TestHFProviderGenerate:

    @pytest.mark.asyncio
    async def test_generate_returns_response(self):
        """Successful 200 response from Space returns data[0] as string."""
        provider = HuggingFaceSaarthiBrain()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": ["Career advice: Work hard."]}

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            result = await provider.generate("What career path is best for me?")
            assert "Career advice" in result

    @pytest.mark.asyncio
    async def test_generate_not_configured_raises(self):
        """RuntimeError raised when HF_SPACE_ID is not configured."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("")):
            with pytest.raises(RuntimeError, match="not configured"):
                await provider.generate("test prompt")

    @pytest.mark.asyncio
    async def test_generate_auth_error_raises_permission_error(self):
        """HTTP 401/403 from Space raises PermissionError immediately (no retry)."""
        provider = HuggingFaceSaarthiBrain()
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(PermissionError, match="auth failure|403|401"):
                await provider.generate("test prompt")


# ---------------------------------------------------------------------------
# 3. Timeout / unavailability
# ---------------------------------------------------------------------------

class TestHFProviderTimeout:

    @pytest.mark.asyncio
    async def test_timeout_raises_runtime_error_after_retries(self):
        """TimeoutException after all retries results in RuntimeError."""
        import httpx as _httpx
        provider = HuggingFaceSaarthiBrain()

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("app.ai.providers.huggingface.asyncio.sleep", new_callable=AsyncMock), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=_httpx.TimeoutException("timed out"))
            mock_client_cls.return_value = mock_client

            with pytest.raises(RuntimeError, match="unreachable|attempts"):
                await provider.generate("test prompt")

    @pytest.mark.asyncio
    async def test_connect_error_raises_runtime_error_after_retries(self):
        """ConnectError after all retries results in RuntimeError."""
        import httpx as _httpx
        provider = HuggingFaceSaarthiBrain()

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("app.ai.providers.huggingface.asyncio.sleep", new_callable=AsyncMock), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=_httpx.ConnectError("connection refused"))
            mock_client_cls.return_value = mock_client

            with pytest.raises(RuntimeError, match="unreachable|attempts"):
                await provider.generate("test prompt")


# ---------------------------------------------------------------------------
# 4. Health check
# ---------------------------------------------------------------------------

class TestHFProviderHealthCheck:

    @pytest.mark.asyncio
    async def test_health_config_required_when_not_configured(self):
        """Health check returns config_required when HF_SPACE_ID not set."""
        provider = HuggingFaceSaarthiBrain()
        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("")):
            result = await provider.health_check()
            assert result["status"] == "config_required"

    @pytest.mark.asyncio
    async def test_health_connected_on_200(self):
        """Health check returns connected when Space root responds 200."""
        provider = HuggingFaceSaarthiBrain()
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            result = await provider.health_check()
            assert result["status"] == "connected"

    @pytest.mark.asyncio
    async def test_health_unavailable_on_connection_error(self):
        """Health check returns unavailable when Space is unreachable."""
        import httpx as _httpx
        provider = HuggingFaceSaarthiBrain()

        with patch("app.ai.providers.huggingface.get_settings", return_value=_mock_settings("Balamaneesh2520/saarthi-ai-brain")), \
             patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(side_effect=_httpx.ConnectError("refused"))
            mock_client_cls.return_value = mock_client

            result = await provider.health_check()
            assert result["status"] == "unavailable"


# ---------------------------------------------------------------------------
# 5. generate_stream interface (gateway compatibility)
# ---------------------------------------------------------------------------

class TestHFProviderStream:

    @pytest.mark.asyncio
    async def test_generate_stream_yields_response(self):
        """generate_stream() must yield at least one chunk on success."""
        provider = HuggingFaceSaarthiBrain()

        with patch.object(provider, "generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Mocked Saarthi Brain response."
            chunks = []
            async for chunk in provider.generate_stream(
                [{"role": "user", "content": "Hello Saarthi"}]
            ):
                chunks.append(chunk)
            assert len(chunks) >= 1
            assert "Mocked" in "".join(chunks)

    @pytest.mark.asyncio
    async def test_generate_stream_propagates_runtime_error(self):
        """generate_stream() must propagate RuntimeError on failure."""
        provider = HuggingFaceSaarthiBrain()

        with patch.object(provider, "generate", new_callable=AsyncMock) as mock_gen:
            mock_gen.side_effect = RuntimeError("HF Space unreachable after 3 attempts")
            with pytest.raises(RuntimeError):
                async for _ in provider.generate_stream(
                    [{"role": "user", "content": "Test"}]
                ):
                    pass
