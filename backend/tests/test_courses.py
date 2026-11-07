def test_catalog_lists_all_programs(client):
    response = client.get("/api/v1/courses")
    assert response.status_code == 200
    body = response.json()
    assert body["total_courses"] >= 50
    assert len({course["program"] for course in body["courses"]}) == 5


def test_catalog_filters_by_program(client):
    response = client.get(
        "/api/v1/courses", params={"prodi": "Teknologi Sains Data"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_courses"] > 0
    assert {course["program"] for course in body["courses"]} == {
        "Teknologi Sains Data"
    }


def test_catalog_pagination_meta(client):
    response = client.get(
        "/api/v1/courses", params={"page": 2, "per_page": 5}
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) <= 5
    assert body["meta"]["page"] == 2
    assert body["meta"]["per_page"] == 5


def test_course_search_matches_code(client):
    response = client.get("/api/v1/courses/search", params={"q": "AGI101"})
    assert response.status_code == 200
    body = response.json()
    assert body["total_hits"] >= 1
    assert any("AGI101" in (item.get("code") or "") for item in body["results"])


def test_legacy_courses_alias(client):
    assert client.get("/api/courses").status_code == 200
    assert client.get("/api/courses/search", params={"q": "kalkulus"}).status_code == 200
