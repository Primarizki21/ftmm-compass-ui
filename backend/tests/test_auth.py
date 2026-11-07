from tests.conftest import SEEDED_STUDENT


def test_login_rejects_wrong_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": SEEDED_STUDENT[0], "password": "salah"},
    )
    assert response.status_code == 401
    assert "error" in response.json()


def test_login_returns_token_and_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": SEEDED_STUDENT[0], "password": SEEDED_STUDENT[1]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["user"]["role"] == "student"
    assert body["user"]["student_profile"]["student_number"]


def test_me_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_current_user(client, student_headers):
    response = client.get("/api/v1/auth/me", headers=student_headers)
    assert response.status_code == 200
    assert response.json()["email"] == SEEDED_STUDENT[0]


def test_legacy_me_alias(client, student_headers):
    assert client.get("/api/auth/me", headers=student_headers).status_code == 200


def test_profile_update_roundtrip(client, student_headers):
    response = client.patch(
        "/api/v1/auth/me/profile",
        headers=student_headers,
        json={"bio": "Fokus rekayasa data"},
    )
    assert response.status_code == 200
    assert response.json()["bio"] == "Fokus rekayasa data"

    restored = client.patch(
        "/api/v1/auth/me/profile",
        headers=student_headers,
        json={"bio": ""},
    )
    assert restored.status_code == 200
