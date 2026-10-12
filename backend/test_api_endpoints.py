import json
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from app import app
import app as app_module

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "default_model" in data
    assert "chatbot_service_online" in data
    print(f"✓ Legacy Health endpoint OK (chatbot_service_online={data.get('chatbot_service_online')})")


def test_v1_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "service" in data
    print("✓ Canonical v1 Health endpoint OK")


def test_courses_endpoint():
    res = client.get("/api/courses?prodi=Teknologi%20Sains%20Data")
    assert res.status_code == 200
    data = res.json()
    assert data["total_courses"] > 0
    print(f"✓ Courses endpoint OK ({data['total_courses']} courses)")


def test_v1_courses_pagination():
    res = client.get("/api/v1/courses?prodi=Teknologi%20Sains%20Data&page=1&per_page=5")
    assert res.status_code == 200
    data = res.json()
    assert "meta" in data
    assert "data" in data
    assert len(data["data"]) <= 5
    assert data["meta"]["page"] == 1
    assert data["meta"]["per_page"] == 5
    print("✓ Canonical v1 Courses adaptive pagination OK")


def test_courses_search_endpoint():
    res = client.get("/api/courses/search?q=kalkulus&top_k=3")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "total_hits" in data
    print(f"✓ Course search endpoint OK (hits={data['total_hits']})")


def test_v1_courses_search_endpoint():
    res = client.get("/api/v1/courses/search?q=algoritma&top_k=2")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "query" in data
    print("✓ Canonical v1 Course search endpoint OK")


def test_courses_proxy_chatbot_ssot():
    mock_response = httpx.Response(
        200,
        json={
            "program_studi": "Teknologi Sains Data",
            "total_courses": 68,
            "programs": ["Teknologi Sains Data", "Teknik Elektro"],
            "courses": [
                {
                    "id": "MK-001",
                    "code": "AGI101",
                    "name": "Agama Islam I",
                    "credits": 2,
                    "semester": 1,
                    "type": "Wajib",
                    "parity": "odd",
                    "desc": "Silabus agama.",
                    "program": "Teknologi Sains Data",
                    "prerequisites": [],
                }
            ],
        },
        request=httpx.Request("GET", "http://127.0.0.1:8000/api/courses"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        res = client.get("/api/courses?prodi=Teknologi%20Sains%20Data")
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "chatbot_ssot"
        assert data["total_courses"] == 68
        assert data["courses"][0]["code"] == "AGI101"
        print("✓ Courses gateway forward to Chatbot SSOT OK (mocked 200)")


def test_chat_gateway_circular_guard():
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:8001"
        res = client.post("/api/chat", json={
            "message": "Test loop prevention",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 500
        data = res.json()
        assert "Circular forwarding detected" in (data.get("detail") or data.get("error", {}).get("message", ""))
        assert "error" in data
        assert data["error"]["code"] in ["internal_server_error", "http_error"]
        print("✓ Chat gateway circular forwarding guard OK (500 + standard envelope)")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


def test_chat_gateway_offline_503():
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:59999"
        res = client.post("/api/chat", json={
            "message": "Halo saya mau konsultasi studi",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 503
        data = res.json()
        assert "Layanan Chatbot AI offline" in (data.get("detail") or data.get("error", {}).get("message", ""))
        assert "error" in data
        assert data["error"]["code"] == "upstream_service_unavailable"
        assert "Retry-After" in res.headers
        print("✓ Chat gateway returns 503 Service Unavailable with standard error envelope")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


def test_chat_gateway_mock_forward():
    mock_response = httpx.Response(
        status_code=200,
        json={
            "reply": "Halo! Saya siap membantu rencana studi Anda.",
            "updated_profile": {
                "program_studi": "Teknologi Sains Data",
                "semester_saat_ini": 3,
            },
            "action_type": "GENERAL",
            "routing_mode": "HYBRID",
            "latency_ms": 14.2,
        },
        request=httpx.Request("POST", "http://127.0.0.1:8000/api/chat"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        res = client.post("/api/chat", json={
            "message": "Halo Compass AI",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["routing_mode"] == "HYBRID"
        assert data["updated_profile"]["program_studi"] == "Teknologi Sains Data"
        assert data["latency_ms"] == 14.2
        print("✓ Chat gateway forward & payload normalization OK (mocked 200)")


def test_v1_chat_endpoint():
    mock_response = httpx.Response(
        status_code=200,
        json={
            "reply": "V1 Chat OK",
            "updated_profile": {
                "program_studi": "Teknologi Sains Data",
                "semester_saat_ini": 2,
            },
            "action_type": "GENERAL",
            "routing_mode": "HYBRID",
            "latency_ms": 10.0,
        },
        request=httpx.Request("POST", "http://127.0.0.1:8000/api/chat"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        res = client.post("/api/v1/chat", json={
            "message": "Halo v1",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["reply"] == "V1 Chat OK"
        print("✓ Canonical v1 Chat endpoint OK")


def test_chat_stream_endpoint():
    async def mock_stream_aiter(*args, **kwargs):
        class MockStreamResponse:
            status_code = 200
            async def aiter_lines(self):
                yield 'data: {"token": "Halo", "done": false}'
                yield 'data: {"token": " mahasiswa", "done": false}'
                yield 'data: {"token": "", "done": true, "reply": "Halo mahasiswa"}'

        yield MockStreamResponse()

    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def mock_stream_ctx(*args, **kwargs):
        class MockStreamResponse:
            status_code = 200
            async def aiter_lines(self):
                yield 'data: {"token": "Halo", "done": false}'
                yield 'data: {"token": " mahasiswa", "done": false}'
                yield 'data: {"token": "", "done": true, "reply": "Halo mahasiswa"}'
        yield MockStreamResponse()

    with patch("httpx.AsyncClient.stream", side_effect=mock_stream_ctx):
        res = client.post("/api/v1/chat/stream", json={
            "message": "Halo stream",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]
        body_text = res.text
        assert "Halo" in body_text
        print("✓ Canonical v1 Chat stream endpoint OK (SSE event stream)")


def test_plan_generate_endpoint():
    res = client.post("/api/plan/generate", json={
        "program_studi": "Teknologi Sains Data",
        "semester_saat_ini": 3,
        "target_kelulusan_semester": 8,
        "riwayat_matkul_lulus": ["Matematika I", "Fisika Dasar I"],
        "minat_fokus": ["Machine Learning"],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "APPLY_DEGREE_PLAN"
    assert "summary" in data
    assert "plan" in data
    print("✓ Plan generation endpoint OK")


def test_v1_plan_validations_endpoint():
    res = client.post("/api/v1/plans/validations", json={
        "program_studi": "Teknologi Sains Data",
        "semester_saat_ini": 1,
        "riwayat_matkul_lulus": [],
        "maks_sks_per_semester": 24,
        "plan": {
            1: [
                {
                    "id": "TSD101",
                    "code": "MA1101",
                    "name": "Matematika I",
                    "credits": 4,
                    "semester": 1,
                    "type": "Wajib",
                    "parity": "odd",
                    "prerequisites": [],
                }
            ]
        }
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    print("✓ Canonical v1 Plan validations endpoint OK")


if __name__ == "__main__":
    test_health()
    test_v1_health()
    test_courses_endpoint()
    test_v1_courses_pagination()
    test_courses_search_endpoint()
    test_v1_courses_search_endpoint()
    test_chat_gateway_circular_guard()
    test_chat_gateway_offline_503()
    test_chat_gateway_mock_forward()
    test_v1_chat_endpoint()
    test_chat_stream_endpoint()
    test_plan_generate_endpoint()
    test_v1_plan_validations_endpoint()
    test_courses_proxy_chatbot_ssot()
    print("\nAll modernized API endpoint integration tests passed! 🚀")
