from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "default_model" in data
    assert "chatbot_service_online" in data
    print(f"✓ Health endpoint OK (chatbot_service_online={data.get('chatbot_service_online')})")


def test_courses_endpoint():
    res = client.get("/api/courses?prodi=Teknologi%20Sains%20Data")
    assert res.status_code == 200
    data = res.json()
    assert data["total_courses"] > 0
    print(f"✓ Courses endpoint OK ({data['total_courses']} courses)")


def test_chat_gateway_circular_guard():
    import app as app_module
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:8001"
        res = client.post("/api/chat", json={
            "message": "Test loop prevention",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 500
        assert "Circular forwarding detected" in res.json().get("detail", "")
        print("✓ Chat gateway circular forwarding guard OK (500 detected)")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


def test_chat_gateway_offline_503():
    import app as app_module
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:59999"
        res = client.post("/api/chat", json={
            "message": "Halo saya mau konsultasi studi",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 503
        assert "Layanan Chatbot AI offline" in res.json().get("detail", "")
        print("✓ Chat gateway returns 503 Service Unavailable when microservice is offline")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


def test_chat_gateway_mock_forward():
    from unittest.mock import patch, AsyncMock
    import httpx

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

if __name__ == "__main__":
    test_health()
    test_courses_endpoint()
    test_chat_gateway_circular_guard()
    test_chat_gateway_offline_503()
    test_chat_gateway_mock_forward()
    test_plan_generate_endpoint()
    print("\nAll API endpoint integration tests passed! 🚀")
