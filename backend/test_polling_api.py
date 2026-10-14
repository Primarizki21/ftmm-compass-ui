from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app import app
import asyncio
from seed import seed_data
try:
    asyncio.run(seed_data())
except Exception:
    pass

client = TestClient(app)


def get_auth_token(identifier: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {identifier}: {res.text}"
    return res.json()["access_token"]


def test_polling_flow():
    # 1. Login sebagai Admin, Dosen, dan Mahasiswa
    admin_token = get_auth_token("admin@ftmm.unair.ac.id", "AdminFTMM2026!")
    dosen_token = get_auth_token("dosen.testing@ftmm.unair.ac.id", "DosenFTMM2026!")
    mhs_token = get_auth_token("mahasiswa.testing@ftmm.unair.ac.id", "Mahasiswa2026!")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    dosen_headers = {"Authorization": f"Bearer {dosen_token}"}
    mhs_headers = {"Authorization": f"Bearer {mhs_token}"}

    # 2. Buat Polling Period Baru oleh Admin (Semester Ganjil 2026/2027)
    # Catatan: Mahasiswa testing berada di semester 3 (ganjil)
    now = datetime.now(timezone.utc)
    start_str = now.isoformat()
    end_str = (now + timedelta(days=30)).isoformat()

    period_payload = {
        "title": "Pra-KRS Peminatan Semester Ganjil 2026/2027",
        "academic_year": "2026/2027",
        "target_term": "ganjil",
        "target_semester": 3,
        "start_date": start_str,
        "end_date": end_str,
        "status": "open",
        "min_quota_threshold": 15,
        "max_votes_per_student": 3,
        "description": "Polling peminatan matkul pilihan semester ganjil FTMM",
    }

    create_res = client.post(
        "/api/v1/admin/polling/periods",
        json=period_payload,
        headers=admin_headers,
    )
    assert create_res.status_code == 201, f"Create period failed: {create_res.text}"
    period_data = create_res.json()
    period_id = period_data["period_id"]
    assert period_data["is_active"] is True
    assert period_data["term"] == "ganjil"
    assert period_data["max_votes_per_student"] == 3
    print("[PASS] Admin create polling period OK")

    # Non-admin tidak boleh membuat polling period
    non_admin_res = client.post(
        "/api/v1/admin/polling/periods",
        json=period_payload,
        headers=mhs_headers,
    )
    assert non_admin_res.status_code == 403
    print("[PASS] Non-admin forbidden from creating polling period OK")

    # 3. GET /api/v1/polling/periods/active
    active_res = client.get("/api/v1/polling/periods/active")
    assert active_res.status_code == 200
    active_period = active_res.json()
    assert active_period["period_id"] == period_id
    assert active_period["term"] == "ganjil"
    assert active_period["is_active"] is True
    print("[PASS] GET active polling period OK")

    # 4. Bersihkan vote sebelumnya jika ada untuk user testing
    my_votes_res = client.get("/api/v1/polling/my-votes", headers=mhs_headers)
    assert my_votes_res.status_code == 200
    for v in my_votes_res.json():
        del_res = client.delete(f"/api/v1/polling/votes/{v['course_id']}", headers=mhs_headers)
        assert del_res.status_code == 204

    # 5. Submit Vote 1 (TSD502) Prioritas 1
    v1_res = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD502", "priority": 1},
        headers=mhs_headers,
    )
    assert v1_res.status_code == 200
    v1_data = v1_res.json()
    assert v1_data["course_id"] == "TSD502"
    assert v1_data["priority"] == 1
    assert "vote_id" in v1_data
    print("[PASS] Submit Vote 1 (TSD502) OK")

    # 6. Idempotent Update (Ganti prioritas TSD502 menjadi 2 tanpa duplicate)
    v1_update = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD502", "priority": 2},
        headers=mhs_headers,
    )
    assert v1_update.status_code == 200
    assert v1_update.json()["priority"] == 2
    assert v1_update.json()["vote_id"] == v1_data["vote_id"]
    print("[PASS] Idempotent update priority OK")

    # 7. Submit Vote 2 (TSD503) & Vote 3 (TSD504)
    v2_res = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD503", "priority": 1},
        headers=mhs_headers,
    )
    assert v2_res.status_code == 200

    v3_res = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD504", "priority": 3},
        headers=mhs_headers,
    )
    assert v3_res.status_code == 200
    print("[PASS] Submit Vote 2 & Vote 3 OK")

    # 8. Batas Maksimal Vote Tercapai (Slot = 3) -> Vote ke-4 harus 409 Conflict
    v4_res = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD505", "priority": 1},
        headers=mhs_headers,
    )
    assert v4_res.status_code == 409
    assert "Batas kuota vote telah tercapai" in v4_res.json()["detail"]
    print("[PASS] Exceeding max votes quota rejected (409 Conflict) OK")

    # 9. GET /api/v1/polling/my-votes -> Harus tepat 3 vote
    my_votes_res = client.get("/api/v1/polling/my-votes", headers=mhs_headers)
    assert my_votes_res.status_code == 200
    my_votes = my_votes_res.json()
    assert len(my_votes) == 3
    cids = {v["course_id"] for v in my_votes}
    assert cids == {"TSD502", "TSD503", "TSD504"}
    print("[PASS] GET my-votes returns 3 registered votes OK")

    # 10. DELETE /api/v1/polling/votes/{course_id} -> Batalkan TSD504
    del_res = client.delete("/api/v1/polling/votes/TSD504", headers=mhs_headers)
    assert del_res.status_code == 204

    # Verifikasi sisa 2 vote
    my_votes_after_del = client.get("/api/v1/polling/my-votes", headers=mhs_headers).json()
    assert len(my_votes_after_del) == 2
    assert "TSD504" not in {v["course_id"] for v in my_votes_after_del}
    print("[PASS] Cancel vote (204 No Content) and slot released OK")

    # 11. Validasi Demand Analytics pada periode yang sedang berjalan dengan vote mahasiswa
    analytics_res = client.get("/api/v1/admin/polling/demand-analytics", headers=dosen_headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "period" in analytics_data
    assert "total_students_voted" in analytics_data
    assert "items" in analytics_data
    assert analytics_data["total_students_voted"] >= 1

    # Cek agregasi item TSD503
    items = analytics_data["items"]
    assert len(items) > 0
    tsd503_item = next((it for it in items if it["course_id"] == "TSD503"), None)
    assert tsd503_item is not None
    assert tsd503_item["total_votes"] >= 1
    assert tsd503_item["priority_1_votes"] >= 1
    assert tsd503_item["status"] in ["QUALIFIED", "BORDERLINE", "UNQUALIFIED"]
    assert tsd503_item["projected_classes"] >= 1
    print("[PASS] Dosen GET demand analytics OK")

    # Mahasiswa dilarang mengakses analitik admin
    mhs_analytics_res = client.get("/api/v1/admin/polling/demand-analytics", headers=mhs_headers)
    assert mhs_analytics_res.status_code == 403
    print("[PASS] Student forbidden from accessing demand analytics OK")

    # 12. Validasi Paritas Semester: Buat periode genap baru
    period_genap_payload = {
        "title": "Pra-KRS Peminatan Semester Genap 2026/2027",
        "academic_year": "2026/2027",
        "target_term": "genap",
        "target_semester": 4,
        "start_date": start_str,
        "end_date": end_str,
        "status": "open",
        "min_quota_threshold": 15,
        "max_votes_per_student": 3,
    }
    client.post("/api/v1/admin/polling/periods", json=period_genap_payload, headers=admin_headers)

    # Karena periode genap sekarang yang paling baru/aktif, mahasiswa (semester 3 ganjil) harus ditolak saat vote
    parity_err_res = client.post(
        "/api/v1/polling/votes",
        json={"course_id": "TSD601", "priority": 1},
        headers=mhs_headers,
    )
    assert parity_err_res.status_code == 400
    assert "Paritas semester tidak sesuai" in parity_err_res.json()["detail"]
    print("[PASS] Parity mismatch validation rejected (400 Bad Request) OK")


if __name__ == "__main__":
    test_polling_flow()
    print("\n[DONE] All polling and demand forecasting API tests passed.")
