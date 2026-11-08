def test_student_dashboard_uses_transcript_records(client, student_headers):
    response = client.get("/api/v1/dashboard/me", headers=student_headers)
    assert response.status_code == 200
    body = response.json()
    stats = body["stats"]
    assert stats["type"] == "student"
    assert stats["sks_target"] == 144
    assert 0 <= stats["sks_completed"] <= stats["sks_target"]
    assert 0 <= stats["gpa"] <= 4
    assert isinstance(body["schedule"], list)


def test_admin_dashboard_reports_real_counts(client, admin_headers):
    body = client.get("/api/v1/dashboard/me", headers=admin_headers).json()
    stats = body["stats"]
    assert stats["type"] == "admin"
    assert stats["total_active_students"] >= 1
    assert stats["total_courses"] >= 1
    assert stats["total_study_programs"] == 5


def test_lecturer_dashboard_has_no_fabricated_assignment(client, lecturer_headers):
    body = client.get("/api/v1/dashboard/me", headers=lecturer_headers).json()
    stats = body["stats"]
    assert stats["type"] == "lecturer"
    assert isinstance(stats["courses_taught"], int)
    assert body["schedule"] == []


def test_dashboard_requires_authentication(client):
    assert client.get("/api/v1/dashboard/me").status_code == 401
