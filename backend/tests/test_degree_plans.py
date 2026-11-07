"""Kontrak resource degree-plans: CRUD, validasi item, dan kepemilikan."""

from fastapi.testclient import TestClient

BASE = "/api/v1/degree-plans"


def _create(client: TestClient, headers: dict, name: str, items=None):
    response = client.post(
        BASE, json={"name": name, "items": items or []}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_requires_authentication(client):
    assert client.get(BASE).status_code == 401


def test_list_reports_created_plans(client, student_headers):
    before = client.get(BASE, headers=student_headers).json()
    plan = _create(client, student_headers, "Terdaftar")

    response = client.get(BASE, headers=student_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert plan["id"] in [item["id"] for item in body["data"]]
    assert body["meta"]["total"] == len(body["data"])
    assert body["meta"]["limit"] == 10
    assert body["meta"]["total"] == before["meta"]["total"] + 1


def test_create_plan_with_items(client, student_headers):
    response = client.post(
        BASE,
        json={
            "name": "Rencana Uji",
            "items": [
                {"course_code": "KIK101", "planned_semester": 1},
                {"course_code": "PDB101", "planned_semester": 1},
            ],
        },
        headers=student_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert response.headers["Location"] == f"/api/v1/degree-plans/{body['id']}"
    assert body["name"] == "Rencana Uji"
    assert body["status"] == "draft"
    assert [item["code"] for item in body["items"]] == ["KIK101", "PDB101"]
    assert all(item["planning_status"] == "planned" for item in body["items"])
    assert body["items"][0]["parity"] == "odd"


def test_duplicate_name_rejected(client, student_headers):
    _create(client, student_headers, "Sama")
    response = client.post(
        BASE, json={"name": "Sama", "items": []}, headers=student_headers
    )
    assert response.status_code == 409, response.text
    assert response.json()["error"]["code"] == "duplicate_plan_name"


def test_plan_limit(client, student_headers):
    current = client.get(BASE, headers=student_headers).json()["meta"]["total"]
    for index in range(current, 10):
        _create(client, student_headers, f"Batas {index}")
    response = client.post(
        BASE, json={"name": "Batas 10", "items": []}, headers=student_headers
    )
    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "plan_limit_reached"


def test_replace_items_is_full_replacement(client, student_headers):
    plan = _create(
        client,
        student_headers,
        "Ganti Isi",
        [
            {"course_code": "KIK101", "planned_semester": 1},
            {"course_code": "PDB101", "planned_semester": 1},
        ],
    )
    response = client.put(
        f"{BASE}/{plan['id']}/items",
        json={"items": [{"course_code": "TSD102", "planned_semester": 2}]},
        headers=student_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert [item["code"] for item in body["items"]] == ["TSD102"]


def test_replace_rejects_unknown_course(client, student_headers):
    plan = _create(client, student_headers, "Unknown")
    response = client.put(
        f"{BASE}/{plan['id']}/items",
        json={"items": [{"course_code": "QQX000", "planned_semester": 1}]},
        headers=student_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "unknown_course"


def test_replace_rejects_other_program_course(client, student_headers):
    plan = _create(client, student_headers, "Lintas Prodi")
    response = client.put(
        f"{BASE}/{plan['id']}/items",
        json={"items": [{"course_code": "AGI101", "planned_semester": 1}]},
        headers=student_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "curriculum_mismatch"


def test_replace_rejects_parity_mismatch(client, student_headers):
    plan = _create(client, student_headers, "Paritas")
    response = client.put(
        f"{BASE}/{plan['id']}/items",
        json={"items": [{"course_code": "TSD102", "planned_semester": 1}]},
        headers=student_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "parity_mismatch"


def test_replace_rejects_duplicate_course(client, student_headers):
    plan = _create(client, student_headers, "Ganda")
    response = client.put(
        f"{BASE}/{plan['id']}/items",
        json={
            "items": [
                {"course_code": "PDB101", "planned_semester": 1},
                {"course_code": "PDB101", "planned_semester": 3},
            ]
        },
        headers=student_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "duplicate_course"


def test_other_user_cannot_read_plan(client, student_headers, admin_headers):
    plan = _create(client, student_headers, "Privat")
    response = client.get(f"{BASE}/{plan['id']}", headers=admin_headers)
    assert response.status_code == 404, response.text
    assert response.json()["error"]["code"] == "not_found"


def test_activation_moves_previous_active_to_draft(client, student_headers):
    first = _create(client, student_headers, "Aktif 1")
    second = _create(client, student_headers, "Aktif 2")

    activated = client.patch(
        f"{BASE}/{first['id']}", json={"status": "active"}, headers=student_headers
    )
    assert activated.status_code == 200, activated.text
    assert activated.json()["status"] == "active"

    activated_second = client.patch(
        f"{BASE}/{second['id']}", json={"status": "active"}, headers=student_headers
    )
    assert activated_second.status_code == 200, activated_second.text

    plans = client.get(BASE, headers=student_headers).json()["data"]
    by_name = {plan["name"]: plan["status"] for plan in plans}
    assert by_name["Aktif 1"] == "draft"
    assert by_name["Aktif 2"] == "active"
    assert plans[0]["name"] == "Aktif 2"


def test_rename_plan(client, student_headers):
    plan = _create(client, student_headers, "Nama Lama")
    response = client.patch(
        f"{BASE}/{plan['id']}", json={"name": "Nama Baru"}, headers=student_headers
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Nama Baru"


def test_rename_conflict(client, student_headers):
    _create(client, student_headers, "Dipakai")
    plan = _create(client, student_headers, "Bebas")
    response = client.patch(
        f"{BASE}/{plan['id']}", json={"name": "Dipakai"}, headers=student_headers
    )
    assert response.status_code == 409, response.text
    assert response.json()["error"]["code"] == "duplicate_plan_name"


def test_delete_plan_removes_items(client, student_headers):
    plan = _create(
        client,
        student_headers,
        "Hapus",
        [{"course_code": "PDB101", "planned_semester": 1}],
    )
    response = client.delete(f"{BASE}/{plan['id']}", headers=student_headers)
    assert response.status_code == 204, response.text
    assert client.get(f"{BASE}/{plan['id']}", headers=student_headers).status_code == 404
    remaining = client.get(BASE, headers=student_headers).json()["data"]
    assert plan["id"] not in [item["id"] for item in remaining]


def test_legacy_alias_available(client, student_headers):
    plan = _create(client, student_headers, "Legacy")
    response = client.get("/api/degree-plans", headers=student_headers)
    assert response.status_code == 200, response.text
    assert plan["id"] in [item["id"] for item in response.json()["data"]]


def test_catalog_limits_to_student_curriculum(client, student_headers):
    response = client.get(f"{BASE}/catalog", headers=student_headers)
    assert response.status_code == 200, response.text
    codes = {item["code"] for item in response.json()["data"]}
    assert "KIK101" in codes
    assert "AGI101" not in codes


def test_catalog_requires_authentication(client):
    assert client.get(f"{BASE}/catalog").status_code == 401


def test_catalog_matches_saved_plan_items(client, student_headers):
    catalog = client.get(f"{BASE}/catalog", headers=student_headers).json()["data"]
    code = catalog[0]["code"]
    semester = catalog[0]["semester"]
    plan = _create(
        client,
        student_headers,
        "Katalog Sinkron",
        [{"course_code": code, "planned_semester": semester}],
    )
    assert [item["code"] for item in plan["items"]] == [code]
