from unittest.mock import AsyncMock, patch

import httpx
import pytest

import settings


@pytest.fixture
def chatbot_url():
    original = settings.CHATBOT_SERVICE_URL
    yield
    settings.CHATBOT_SERVICE_URL = original


def test_circular_forwarding_is_blocked(client, chatbot_url):
    settings.CHATBOT_SERVICE_URL = "http://127.0.0.1:8001"
    response = client.post(
        "/api/chat", json={"message": "halo", "history": [], "student_profile": {}}
    )
    assert response.status_code == 500
    body = response.json()
    assert "Circular forwarding detected" in body["error"]["message"]


def test_offline_chatbot_returns_503(client, chatbot_url):
    settings.CHATBOT_SERVICE_URL = "http://127.0.0.1:59999"
    response = client.post(
        "/api/chat", json={"message": "halo", "history": [], "student_profile": {}}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "upstream_service_unavailable"
    assert "Retry-After" in response.headers


def test_chat_forward_passes_reply_and_profile(client, chatbot_url):
    settings.CHATBOT_SERVICE_URL = "http://chatbot.test"
    mocked = httpx.Response(
        status_code=200,
        json={
            "reply": "Halo, saya bantu.",
            "updated_profile": {
                "program_studi": "Teknologi Sains Data",
                "semester_saat_ini": 4,
            },
            "action_type": "GENERAL",
            "routing_mode": "HYBRID",
            "latency_ms": 12.5,
        },
        request=httpx.Request("POST", "http://chatbot.test/api/chat"),
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mocked
        response = client.post(
            "/api/chat",
            json={"message": "halo", "history": [], "student_profile": {}},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Halo, saya bantu."
    assert body["updated_profile"]["semester_saat_ini"] == 4
    assert body["routing_mode"] == "HYBRID"


def test_stream_endpoint_emits_sse(client, chatbot_url):
    settings.CHATBOT_SERVICE_URL = "http://chatbot.test"

    async def fake_lines(*args, **kwargs):
        for payload in (
            'data: {"token": "Halo"}',
            'data: {"done": true, "reply": "Halo"}',
        ):
            yield payload

    class FakeResponse:
        status_code = 200

        def __init__(self):
            self.aiter_lines = fake_lines

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

    with patch("httpx.AsyncClient.stream", return_value=FakeResponse()):
        response = client.post(
            "/api/v1/chat/stream",
            json={"message": "halo", "history": [], "student_profile": {}},
        )
    assert response.status_code == 200
    assert "data:" in response.text
