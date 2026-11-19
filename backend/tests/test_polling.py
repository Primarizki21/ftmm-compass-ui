import datetime
import uuid

from sqlalchemy import select, func, update

from auth import create_access_token
from catalog import get_all_courses, prodi_code
from models import (
    Course,
    CurriculumCourse,
    ElectiveCourseVote,
    ElectivePollingPeriod,
    LecturerProfile,
    StudentProfile,
    StudyProgram,
    User,
)

def _token_headers(user_id, role):
    token = create_access_token(
        data={"sub": str(user_id), "role": role, "ver": 0}
    )
    return {"Authorization": f"Bearer {token}"}


def _target_semester(term):
    return 3 if term == "ganjil" else 4


def _voter_semester(term):
    return _target_semester(term) - 1


def _active_period(client, headers):
    response = client.get("/api/v1/polling/periods/active", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _catalog_course(code):
    return next(course for course in get_all_courses() if course.code == code)


def _period_parity(period):
    return "odd" if period["term"] == "ganjil" else "even"


def _electives_for_parity(period, *, matching=True, limit=1):
    parity = _period_parity(period)
    return [
        course
        for course in get_all_courses()
        if course.type == "Pilihan"
        and prodi_code(course.program) == "TSD"
        and (course.parity == parity) is matching
    ][:limit]


def _create_user(
    client,
    db_session,
    *,
    role,
    email=None,
    prodi="TSD",
    coordinator=False,
    semester=None,
):
    email = email or f"{role}.{uuid.uuid4().hex[:10]}@ftmm.unair.ac.id"

    async def insert():
        user = User(
            email=email,
            full_name=f"Uji {role}",
            role=role,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        if role == "student":
            program = (
                await db_session.execute(
                    select(StudyProgram).where(StudyProgram.program_code == prodi)
                )
            ).scalars().first()
            db_session.add(
                StudentProfile(
                    user_id=user.user_id,
                    study_program_id=program.study_program_id,
                    student_number=f"T{uuid.uuid4().hex[:9]}",
                    admission_year=2024,
                    current_semester=semester or 4,
                )
            )
        elif role == "lecturer" and prodi:
            program = (
                await db_session.execute(
                    select(StudyProgram).where(StudyProgram.program_code == prodi)
                )
            ).scalars().first()
            db_session.add(
                LecturerProfile(
                    user_id=user.user_id,
                    study_program_id=program.study_program_id,
                    is_program_coordinator=coordinator,
                )
            )
        await db_session.flush()
        return user.user_id

    user_id = client.portal.call(insert)
    return _token_headers(user_id, role)


def _shared_codes(client, db_session):
    async def query():
        rows = (
            await db_session.execute(
                select(Course.course_code)
                .join(CurriculumCourse, CurriculumCourse.course_id == Course.course_id)
                .where(CurriculumCourse.course_scope.in_(("fakultas", "universitas")))
            )
        ).scalars().all()
        return set(rows)

    return client.portal.call(query)


def _assert_error(response, status_code, code):
    assert response.status_code == status_code, response.text
    body = response.json()
    assert body["error"]["code"] == code, body


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


def test_vote_outside_period_parity_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_target_semester(period["term"]),
    )
    course = _electives_for_parity(period)[0]
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    _assert_error(response, 400, "parity_mismatch")


def test_vote_for_next_semester_is_allowed(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client, db_session, role="student", semester=_voter_semester(period["term"])
    )
    course = _electives_for_parity(period)[0]
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    assert response.status_code == 200, response.text
    assert response.json()["course_code"] == course.code

def test_vote_for_course_outside_period_parity_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    course = _electives_for_parity(period, matching=False)[0]
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    _assert_error(response, 400, "parity_mismatch")


def test_demand_analytics_authorization(client, student_headers, pj_headers, admin_headers):
    denied = client.get(
        "/api/v1/admin/polling/demand-analytics", headers=student_headers
    )
    _assert_error(denied, 403, "forbidden")

    allowed = client.get(
        "/api/v1/admin/polling/demand-analytics", headers=pj_headers
    )
    assert allowed.status_code == 200, allowed.text
    assert "items" in allowed.json()

    admin = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=admin_headers,
        params={"study_program": "TE"},
    )
    assert admin.status_code == 200, admin.text
    assert admin.json()["items"]


def test_faculty_staff_is_denied_admin_analytics(client, db_session):
    headers = _create_user(client, db_session, role="faculty_staff", prodi=None)
    response = client.get("/api/v1/admin/polling/demand-analytics", headers=headers)
    _assert_error(response, 403, "forbidden")


def test_lecturer_without_profile_is_denied(client, db_session):
    headers = _create_user(client, db_session, role="lecturer", prodi=None)
    response = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=headers,
        params={"study_program": "TSD"},
    )
    _assert_error(response, 403, "prodi_belum_ditetapkan")


def test_non_coordinator_lecturer_is_denied(client, db_session):
    headers = _create_user(client, db_session, role="lecturer", coordinator=False)
    response = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=headers,
        params={"study_program": "TSD"},
    )
    _assert_error(response, 403, "not_program_coordinator")


def test_pj_tsd_sees_only_own_and_shared_courses(client, pj_headers, db_session):
    shared = _shared_codes(client, db_session)
    response = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=pj_headers,
        params={"study_program": "TSD"},
    )
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert any(prodi_code(item["study_program"]) == "TSD" for item in items)
    for item in items:
        assert (
            prodi_code(item["study_program"]) == "TSD"
            or item["course_code"] in shared
        ), item
    assert all(item["course_code"] != "RKK304" for item in items)

    forced_all = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=pj_headers,
        params={"study_program": "all"},
    )
    assert forced_all.status_code == 200, forced_all.text
    for item in forced_all.json()["items"]:
        assert (
            prodi_code(item["study_program"]) == "TSD"
            or item["course_code"] in shared
        ), item


def test_pj_tsd_requesting_other_prodi_is_denied(client, pj_headers):
    response = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=pj_headers,
        params={"study_program": "TE"},
    )
    _assert_error(response, 403, "akses_prodi_ditolak")


def test_denominator_follows_prodi_filter(client, db_session, admin_headers):
    scoped = client.get(
        "/api/v1/admin/polling/demand-analytics",
        headers=admin_headers,
        params={"study_program": "TSD"},
    ).json()
    aggregate = client.get(
        "/api/v1/admin/polling/demand-analytics", headers=admin_headers
    ).json()

    async def count_tsd_voters():
        return (
            await db_session.execute(
                select(func.count(func.distinct(ElectiveCourseVote.user_id)))
                .join(User, User.user_id == ElectiveCourseVote.user_id)
                .join(StudentProfile, StudentProfile.user_id == User.user_id)
                .join(
                    StudyProgram,
                    StudyProgram.study_program_id == StudentProfile.study_program_id,
                )
                .where(
                    ElectiveCourseVote.polling_period_id == uuid.UUID(scoped["period"]["period_id"]),
                    StudyProgram.program_code == "TSD",
                )
            )
        ).scalar()

    expected = client.portal.call(count_tsd_voters)
    assert scoped["total_students_voted"] == expected
    assert expected < aggregate["total_students_voted"]


def test_unknown_course_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": "MK-TIDAK-ADA", "priority": 1},
    )
    _assert_error(response, 422, "unknown_course")


def test_wajib_course_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    course = _catalog_course("AGI101")
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    _assert_error(response, 422, "course_not_elective")


def test_other_prodi_elective_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    course = _catalog_course("RKK304")
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    _assert_error(response, 422, "course_wrong_program")


def test_inactive_course_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    course = _catalog_course("SIC304")
    async def deactivate():
        course_ids = select(Course.course_id).where(Course.course_code == course.code)
        await db_session.execute(
            update(CurriculumCourse)
            .where(CurriculumCourse.course_id.in_(course_ids))
            .values(is_active=False)
        )

    client.portal.call(deactivate)
    response = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": course.id, "priority": 1},
    )
    _assert_error(response, 409, "course_inactive")


def test_duplicate_priority_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    first, second = _electives_for_parity(period, limit=2)
    assert client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": first.id, "priority": 1},
    ).status_code == 200
    duplicate = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": second.id, "priority": 1},
    )
    _assert_error(duplicate, 422, "duplicate_priority")


def test_quota_reached_is_rejected(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )

    async def shrink_quota():
        active = (
            await db_session.execute(
                select(ElectivePollingPeriod).where(
                    ElectivePollingPeriod.status == "open"
                )
            )
        ).scalars().first()
        active.max_votes_per_student = 1
        await db_session.flush()

    client.portal.call(shrink_quota)
    first, second = _electives_for_parity(period, limit=2)
    assert client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": first.id, "priority": 1},
    ).status_code == 200
    quota = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": second.id, "priority": 2},
    )
    _assert_error(quota, 409, "quota_reached")


def test_updating_existing_vote_changes_priority_only(client, db_session):
    period = _active_period(client, None)
    headers = _create_user(
        client,
        db_session,
        role="student",
        semester=_voter_semester(period["term"]),
    )
    first, second = _electives_for_parity(period, limit=2)
    client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": first.id, "priority": 1},
    )
    client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": second.id, "priority": 2},
    )
    updated = client.post(
        "/api/v1/polling/votes",
        headers=headers,
        json={"course_id": first.id, "priority": 3},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["course_id"] == first.id
    assert updated.json()["priority"] == 3
    votes = client.get("/api/v1/polling/my-votes", headers=headers).json()
    assert len(votes) == 2
    assert sum(vote["priority"] == 3 for vote in votes) == 1


def test_delete_vote_leaves_old_periods_untouched(client, db_session):
    period = _active_period(client, None)
    email = "student.hapusperiode@ftmm.unair.ac.id"
    headers = _create_user(
        client,
        db_session,
        role="student",
        email=email,
        semester=_voter_semester(period["term"]),
    )
    course = _catalog_course("SIC304")

    async def seed_cross_period_votes():
        student = (
            await db_session.execute(select(User).where(User.email == email))
        ).scalars().first()
        now = datetime.datetime.now(datetime.timezone.utc)
        old = ElectivePollingPeriod(
            title="Periode lama",
            academic_year="2024/2025",
            target_term=period["term"],
            target_semester=_target_semester(period["term"]),
            start_date=now - datetime.timedelta(days=400),
            end_date=now - datetime.timedelta(days=370),
            status="closed",
            min_quota_threshold=15,
            max_votes_per_student=3,
        )
        db_session.add(old)
        await db_session.flush()
        for period_id in (uuid.UUID(period["period_id"]), old.polling_period_id):
            db_session.add(
                ElectiveCourseVote(
                    polling_period_id=period_id,
                    user_id=student.user_id,
                    course_id=course.id,
                    course_code=course.code,
                    course_name=course.name,
                    credits=course.credits,
                    priority=1,
                )
            )
        await db_session.flush()
        return student.user_id

    user_id = client.portal.call(seed_cross_period_votes)
    deleted = client.delete(f"/api/v1/polling/votes/{course.id}", headers=headers)
    assert deleted.status_code == 204, deleted.text

    async def remaining():
        rows = (
            await db_session.execute(
                select(ElectiveCourseVote.polling_period_id).where(
                    ElectiveCourseVote.user_id == user_id,
                    ElectiveCourseVote.course_code == course.code,
                )
            )
        ).scalars().all()
        return rows

    remaining_periods = client.portal.call(remaining)
    assert uuid.UUID(period["period_id"]) not in remaining_periods
    assert len(remaining_periods) == 1

