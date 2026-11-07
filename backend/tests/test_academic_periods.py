from datetime import date


def test_current_period_requires_authentication(client):
    assert client.get("/api/v1/academic-periods/current").status_code == 401


def test_current_period_contract(client, student_headers):
    response = client.get(
        "/api/v1/academic-periods/current", headers=student_headers
    )
    assert response.status_code == 200
    body = response.json()

    assert body["term"] in {"ganjil", "genap", "pendek"}
    assert body["label"].startswith("Semester ")
    assert body["term_label"]
    assert body["week_label"]
    assert body["semester_weeks"] == 16

    start = date.fromisoformat(body["start_date"])
    end = date.fromisoformat(body["end_date"])
    monday = date.fromisoformat(body["first_week_monday"])
    assert start <= monday <= end
    assert monday.weekday() == 0


def test_legacy_current_period_alias(client, student_headers):
    response = client.get("/api/academic-periods/current", headers=student_headers)
    assert response.status_code == 200
    assert response.json()["semester_weeks"] == 16
