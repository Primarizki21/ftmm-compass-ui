from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "default_model" in data
    print("✓ Health endpoint OK")

def test_courses_endpoint():
    res = client.get("/api/courses?prodi=Teknologi%20Sains%20Data")
    assert res.status_code == 200
    data = res.json()
    assert data["total_courses"] > 0
    print(f"✓ Courses endpoint OK ({data['total_courses']} courses)")

def test_chat_slot_filling_api():
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

if __name__ == "__main__":
    test_health()
    test_courses_endpoint()
    test_chat_slot_filling_api()
    print("\nAll API endpoint integration tests passed! 🚀")
