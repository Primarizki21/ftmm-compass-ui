def test_notifications_list_for_student(client, student_headers):
    response = client.get("/api/v1/notifications/me", headers=student_headers)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["items"], list)
    if body["items"]:
        assert {"id", "title", "message", "type", "timestamp", "is_read"} <= set(
            body["items"][0]
        )


def test_mark_all_notifications_read(client, student_headers):
    client.post("/api/v1/notifications/mark-all-read", headers=student_headers)
    body = client.get("/api/v1/notifications/me", headers=student_headers).json()
    assert all(item["is_read"] for item in body["items"])
