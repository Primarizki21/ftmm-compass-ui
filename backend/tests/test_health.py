def test_health_reports_database_and_chatbot(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["database_online"] is True
    assert "chatbot_service_online" in body


def test_legacy_health_alias(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] in {"healthy", "degraded"}


def test_rate_limit_envelope_shape(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/json")
