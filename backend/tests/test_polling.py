def test_active_period_has_quorum_fields(client, student_headers):
    response = client.get("/api/v1/polling/periods/active", headers=student_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["min_quorum"] > 0
    assert body["max_votes_per_student"] > 0


def test_my_votes_respects_quota(client, student_headers):
    period = client.get(
        "/api/v1/polling/periods/active", headers=student_headers
    ).json()
    response = client.get("/api/v1/polling/my-votes", headers=student_headers)
    assert response.status_code == 200
    assert len(response.json()) <= period["max_votes_per_student"]


def test_vote_outside_period_parity_is_rejected(client, student_headers):
    period = client.get(
        "/api/v1/polling/periods/active", headers=student_headers
    ).json()
    me = client.get("/api/v1/auth/me", headers=student_headers).json()
    student_term = (
        "ganjil"
        if me["student_profile"]["current_semester"] % 2 == 1
        else "genap"
    )
    response = client.post(
        "/api/v1/polling/votes",
        headers=student_headers,
        json={"course_id": "SIC304", "priority": 1},
    )
    if period["term"] == student_term:
        assert response.status_code == 200
        assert response.json()["course_id"] == "SIC304"
    else:
        assert response.status_code == 400
        assert response.json()["error"]["code"]


def test_demand_analytics_requires_staff_role(client, student_headers, lecturer_headers):
    denied = client.get(
        "/api/v1/admin/polling/demand-analytics", headers=student_headers
    )
    assert denied.status_code == 403

    allowed = client.get(
        "/api/v1/admin/polling/demand-analytics", headers=lecturer_headers
    )
    assert allowed.status_code == 200
    assert "items" in allowed.json()
