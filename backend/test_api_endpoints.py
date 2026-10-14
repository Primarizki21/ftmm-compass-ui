from unittest.mock import patch, AsyncMock
import httpx
import time
from fastapi.testclient import TestClient
from app import app
import app as app_module
import data_loader
import asyncio
from seed import seed_data
try:
    asyncio.run(seed_data())
except Exception:
    pass

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
    assert "database_online" in data
    assert data["database_online"] is True
    print(f"✓ Canonical v1 Health endpoint OK (database_online={data['database_online']})")


def test_courses_endpoint():
    res = client.get("/api/courses?prodi=Teknologi%20Sains%20Data")
    assert res.status_code == 200
    data = res.json()
    assert data["total_courses"] > 0
    print(f"✓ Courses endpoint OK ({data['total_courses']} courses)")

def test_v1_courses_all_prodis():
    res = client.get("/api/v1/courses")
    assert res.status_code == 200
    data = res.json()
    assert data["total_courses"] > 0
    if data_loader.OFFICIAL_CURRICULUM:
        assert data["total_courses"] >= 300
    else:
        assert data["total_courses"] >= 50
    prodis = set(c.get("program") for c in data.get("courses", []))
    assert len(prodis) == 5

    res_sem3 = client.get("/api/v1/courses?semester=3")
    assert res_sem3.status_code == 200
    data_sem3 = res_sem3.json()
    prodis_sem3 = set(c.get("program") for c in data_sem3.get("courses", []))
    assert len(prodis_sem3) == 5
    print("✓ Canonical v1 Courses all prodis and semester 3 OK")


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

def test_v1_plan_validations_religion_conflict():
    res = client.post("/api/v1/plans/validations", json={
        "program_studi": "Teknologi Sains Data",
        "semester_saat_ini": 1,
        "riwayat_matkul_lulus": [],
        "maks_sks_per_semester": 24,
        "plan": {
            1: [
                {
                    "id": "AGI101",
                    "code": "AGI101",
                    "name": "Agama Islam I",
                    "credits": 2,
                    "semester": 1,
                    "type": "Wajib",
                    "parity": "odd",
                    "prerequisites": [],
                },
                {
                    "id": "AGK101",
                    "code": "AGK101",
                    "name": "Agama Katolik I",
                    "credits": 2,
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
    assert data["is_valid"] is False
    assert any("Pelanggaran kurikulum agama" in e for e in data["errors"])
    print("✓ Canonical v1 Plan validations religion conflict correctly caught")

def test_courses_fallback_isolation():
    original_official = data_loader.OFFICIAL_CURRICULUM
    try:
        data_loader.OFFICIAL_CURRICULUM = {}
        with patch.object(app_module, "CHATBOT_SERVICE_URL", "http://127.0.0.1:9999"):
            res = client.get("/api/v1/courses")
            assert res.status_code == 200
            data = res.json()
            assert data["total_courses"] >= 50
            prodis = set(c.get("program") for c in data.get("courses", []))
            assert len(prodis) == 5

            res_prodi = client.get("/api/v1/courses?prodi=Teknologi%20Sains%20Data")
            assert res_prodi.status_code == 200
            data_prodi = res_prodi.json()
            assert data_prodi["total_courses"] > 0
            assert all(c["program"] == "Teknologi Sains Data" for c in data_prodi.get("courses", []))
        print("✓ Dual-mode fallback isolation OK (resilient without Ekstrak/ and offline SSOT)")
    finally:
        data_loader.OFFICIAL_CURRICULUM = original_official

def test_auth_login_and_me():
    # 1. Invalid login credentials
    bad_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "mahasiswa.testing@ftmm.unair.ac.id", "password": "wrongpassword"},
    )
    assert bad_res.status_code == 401
    assert "NIM/Email atau kata sandi tidak valid" in bad_res.json()["detail"]
    print("✓ Auth login invalid password rejected (401) OK")

    # 2. Valid login by Email (Student)
    mhs_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "mahasiswa.testing@ftmm.unair.ac.id", "password": "Mahasiswa2026!"},
    )
    assert mhs_res.status_code == 200
    mhs_data = mhs_res.json()
    assert "access_token" in mhs_data
    assert mhs_data["token_type"] == "bearer"
    assert mhs_data["expires_in"] == 86400
    assert mhs_data["user"]["email"] == "mahasiswa.testing@ftmm.unair.ac.id"
    assert mhs_data["user"]["role"] == "student"
    assert mhs_data["user"]["student_profile"]["student_number"] == "164231001"
    assert mhs_data["user"]["student_profile"]["study_program"] == "Teknologi Sains Data"
    assert mhs_data["user"]["student_profile"]["admission_year"] == 2023
    assert mhs_data["user"]["student_profile"]["current_semester"] == 3
    print("✓ Auth login via Email (Student) OK")

    # 3. Valid login by NIM (Student)
    nim_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "164231001", "password": "Mahasiswa2026!"},
    )
    assert nim_res.status_code == 200
    nim_data = nim_res.json()
    assert nim_data["user"]["email"] == "mahasiswa.testing@ftmm.unair.ac.id"
    print("✓ Auth login via NIM (Student) OK")

    # 4. GET /api/v1/auth/me without token -> 401
    unauth_me = client.get("/api/v1/auth/me")
    assert unauth_me.status_code == 401
    print("✓ Auth me unauthorized request rejected (401) OK")

    # 5. GET /api/v1/auth/me with valid bearer token
    token = mhs_data["access_token"]
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "mahasiswa.testing@ftmm.unair.ac.id"
    assert me_data["student_profile"]["student_number"] == "164231001"
    assert me_data["academic_identifier"] == "164231001"
    assert me_data["unit_name"] == "Teknologi Sains Data"
    assert me_data["auth_provider"] == "Cybercampus SSO UNAIR"
    print("✓ Auth me with valid token and role-specific identity OK")

    # 6. Valid login Admin
    admin_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@ftmm.unair.ac.id", "password": "AdminFTMM2026!"},
    )
    assert admin_res.status_code == 200
    assert admin_res.json()["user"]["role"] == "admin"
    assert admin_res.json()["user"]["academic_identifier"] == "198504122010121003"
    assert admin_res.json()["user"]["unit_name"] == "Sub-Bagian Akademik & Kemahasiswaan FTMM"
    print("✓ Auth login Admin OK")

    # 7. Valid login Dosen
    dosen_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "dosen.testing@ftmm.unair.ac.id", "password": "DosenFTMM2026!"},
    )
    assert dosen_res.status_code == 200
    assert dosen_res.json()["user"]["role"] == "lecturer"
    assert dosen_res.json()["user"]["academic_identifier"] == "198803152015041002"
    assert dosen_res.json()["user"]["unit_name"] == "Teknologi Sains Data"
    print("✓ Auth login Dosen OK")


def test_auth_update_profile():
    mhs_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "164231001", "password": "Mahasiswa2026!"},
    )
    token = mhs_res.json()["access_token"]
    patch_res = client.patch(
        "/api/v1/auth/me/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "phone_number": "081299887766",
            "bio": "Peminat AI & Data Science FTMM UNAIR",
            "career_interests": ["Machine Learning", "Robotics"],
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["phone_number"] == "081299887766"
    assert updated["bio"] == "Peminat AI & Data Science FTMM UNAIR"
    assert "Robotics" in updated["career_interests"]
    print("✓ Profile update via PATCH /api/v1/auth/me/profile OK")


def test_dashboard_me_roles():
    # 1. Unauthorized request
    unauth_res = client.get("/api/v1/dashboard/me")
    assert unauth_res.status_code == 401
    print("✓ Dashboard me unauthorized request rejected (401) OK")

    # 2. Mahasiswa login & dashboard
    mhs_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "164231001", "password": "Mahasiswa2026!"},
    )
    assert mhs_login.status_code == 200
    mhs_token = mhs_login.json()["access_token"]
    mhs_dash = client.get(
        "/api/v1/dashboard/me",
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert mhs_dash.status_code == 200
    mhs_data = mhs_dash.json()
    assert mhs_data["role"] == "student"
    assert mhs_data["student_number"] == "164231001"
    assert mhs_data["stats"]["type"] == "student"
    assert mhs_data["stats"]["sks_completed"] == 44
    assert mhs_data["stats"]["gpa"] == 3.78
    assert len(mhs_data["schedule"]) >= 1
    print(f"✓ Dashboard me Mahasiswa OK (SKS={mhs_data['stats']['sks_completed']}, IPK={mhs_data['stats']['gpa']}, Jadwal={len(mhs_data['schedule'])} items)")

    # 3. Dosen login & dashboard
    dosen_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "dosen.testing@ftmm.unair.ac.id", "password": "DosenFTMM2026!"},
    )
    assert dosen_login.status_code == 200
    dosen_token = dosen_login.json()["access_token"]
    dosen_dash = client.get(
        "/api/v1/dashboard/me",
        headers={"Authorization": f"Bearer {dosen_token}"},
    )
    assert dosen_dash.status_code == 200
    dosen_data = dosen_dash.json()
    assert dosen_data["role"] == "lecturer"
    assert dosen_data["stats"]["type"] == "lecturer"
    assert dosen_data["stats"]["courses_taught"] >= 1
    assert dosen_data["stats"]["sks_taught"] >= 3
    assert len(dosen_data["schedule"]) >= 1
    print(f"✓ Dashboard me Dosen OK (MK Diampu={dosen_data['stats']['courses_taught']}, SKS={dosen_data['stats']['sks_taught']}, Jadwal Mengajar={len(dosen_data['schedule'])} items)")

    # 4. Admin login & dashboard
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@ftmm.unair.ac.id", "password": "AdminFTMM2026!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_dash = client.get(
        "/api/v1/dashboard/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_dash.status_code == 200
    admin_data = admin_dash.json()
    assert admin_data["role"] == "admin"
    assert admin_data["stats"]["type"] == "admin"
    assert admin_data["stats"]["total_active_students"] >= 1240
    assert admin_data["stats"]["total_lecturers"] >= 68
    print(f"✓ Dashboard me Admin OK (Total Mhs={admin_data['stats']['total_active_students']}, Dosen={admin_data['stats']['total_lecturers']})")

    # 5. Dual-tier legacy endpoint check
    legacy_dash = client.get(
        "/api/dashboard/me",
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert legacy_dash.status_code == 200
    print("✓ Dual-tier legacy /api/dashboard/me alias OK")

def test_admin_courses_crud():
    # 1. Login student & admin
    mhs_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "mahasiswa.testing@ftmm.unair.ac.id", "password": "Mahasiswa2026!"},
    )
    assert mhs_res.status_code == 200
    mhs_token = mhs_res.json()["access_token"]

    admin_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@ftmm.unair.ac.id", "password": "AdminFTMM2026!"},
    )
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]

    test_code = f"TSD{int(time.time() * 1000) % 800 + 100}"
    course_payload = {
        "course_code": test_code,
        "course_name": "Sistem Otonom Cerdas",
        "program_name": "Teknologi Sains Data",
        "credits": 3,
        "recommended_semester": 7,
        "term": "ganjil",
        "course_type": "Pilihan",
        "description": "Pengembangan sistem otonom cerdas berbasis AI dan robotika.",
        "prerequisites": ["Kecerdasan Buatan"],
    }

    # 2. Student forbidden
    res_forbidden = client.post(
        "/api/v1/admin/courses",
        json=course_payload,
        headers={"Authorization": f"Bearer {mhs_token}"},
    )
    assert res_forbidden.status_code == 403
    print("✓ Student forbidden from creating course OK")

    # 3. Admin create course
    res_create = client.post(
        "/api/v1/admin/courses",
        json=course_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_create.status_code == 201
    created_data = res_create.json()
    assert created_data["code"] == test_code
    assert created_data["name"] == "Sistem Otonom Cerdas"
    assert created_data["credits"] == 3
    print("✓ Admin create course OK")

    # 4. Course appears in list
    list_res = client.get("/api/v1/courses?prodi=Teknologi Sains Data")
    assert list_res.status_code == 200
    found = any(c["code"] == test_code for c in list_res.json()["courses"])
    assert found is True
    print("✓ Newly created course found in catalog OK")

    # 5. Admin update course
    update_payload = {
        "course_name": "Sistem Otonom Cerdas & Robotika Terapan",
        "credits": 4,
    }
    res_update = client.put(
        f"/api/v1/admin/courses/{test_code}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Sistem Otonom Cerdas & Robotika Terapan"
    assert res_update.json()["credits"] == 4
    print("✓ Admin update course OK")

    # 6. Admin delete (soft-delete) course
    res_del = client.delete(
        f"/api/v1/admin/courses/{test_code}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_del.status_code == 200
    print("✓ Admin delete course OK")


if __name__ == "__main__":
    test_health()
    test_v1_health()
    test_courses_endpoint()
    test_v1_courses_all_prodis()
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
    test_v1_plan_validations_religion_conflict()
    test_courses_proxy_chatbot_ssot()
    test_courses_fallback_isolation()
    test_auth_login_and_me()
    test_auth_update_profile()
    test_dashboard_me_roles()
    test_admin_courses_crud()
    print("\nAll modernized API endpoint integration tests passed! 🚀")
