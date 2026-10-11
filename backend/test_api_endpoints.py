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


def test_chat_gateway_with_microservice():
    res = client.post("/api/chat", json={
        "message": "Halo, saya mau tanya matkul semester 1 TSD",
        "history": [],
        "student_profile": {"program_studi": "Teknologi Sains Data", "semester_saat_ini": 1}
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["reply"]) > 0
    assert "updated_profile" in data
    latency_str = f"{data['latency_ms']:.1f}ms" if data.get("latency_ms") else "N/A"
    print(f"✓ Chat gateway microservice call OK (mode={data.get('routing_mode')}, latency={latency_str})")


def test_chat_gateway_fallback_when_offline():
    import app as app_module
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:59999"
        res = client.post("/api/chat", json={
            "message": "Halo saya mau buat krs dan rencana studi",
            "history": [],
            "student_profile": {}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["action_type"] == "NEED_INFO"
        print("✓ Chat gateway graceful fallback OK when microservice is offline")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


def test_chat_slot_filling_api():
    import app as app_module
    original_url = app_module.CHATBOT_SERVICE_URL
    try:
        # Use local fallback agent to verify the deterministic slot-filling flow
        app_module.CHATBOT_SERVICE_URL = "http://127.0.0.1:59999"
        # 1. First turn - partial
        res1 = client.post("/api/chat", json={
            "message": "Halo saya mau buat krs dan rencana studi",
            "student_profile": {}
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["action_type"] == "NEED_INFO"

        # 2. Second turn - provide slots
        res2 = client.post("/api/chat", json={
            "message": "Saya mahasiswa Sains Data semester 3, minat di Machine Learning dan Data Visualization.",
            "student_profile": data1["updated_profile"]
        })
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["action_type"] == "CONFIRM_PROFILE"

        # 3. Third turn - confirm
        res3 = client.post("/api/chat", json={
            "message": "Ya benar, buatkan rencananya sekarang.",
            "student_profile": data2["updated_profile"]
        })
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["action_type"] == "PLAN_GENERATED"
        assert data3["plan_payload"] is not None
        assert data3["plan_payload"]["summary"]["total_credits"] > 0
        print("✓ Full 3-turn Chatbot Slot-Filling API flow OK")
    finally:
        app_module.CHATBOT_SERVICE_URL = original_url


if __name__ == "__main__":
    test_health()
    test_courses_endpoint()
    test_chat_gateway_with_microservice()
    test_chat_gateway_fallback_when_offline()
    test_chat_slot_filling_api()
    print("\nAll API endpoint integration tests passed! 🚀")
