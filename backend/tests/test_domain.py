from schemas import PlacedCourseModel, StudentProfile
from tools.prerequisite_validator import validate_plan_constraints
from tools.planner import generate_study_plan


def _course(name, code, credits, semester, parity, course_type="Wajib"):
    return PlacedCourseModel(
        name=name,
        code=code,
        credits=credits,
        semester=semester,
        type=course_type,
        parity=parity,
    )


def test_validator_rejects_semester_parity_mismatch():
    plan = {2: [_course("Matematika I", "MA1101", 4, 2, "odd")]}
    result = validate_plan_constraints(plan, [])
    assert result.is_valid is False


def test_validator_rejects_sks_over_limit():
    plan = {1: [_course(f"MK {index}", f"MK{index}", 10, 1, "odd") for index in range(3)]}
    result = validate_plan_constraints(plan, [], maks_sks_per_semester=24)
    assert result.is_valid is False


def test_validator_rejects_two_religions():
    plan = {
        1: [
            _course("Agama Islam", "AGI101", 2, 1, "odd"),
            _course("Agama Katolik", "AGK101", 2, 1, "odd"),
        ]
    }
    result = validate_plan_constraints(plan, [])
    assert result.is_valid is False


def test_validator_accepts_consistent_plan():
    plan = {1: [_course("Matematika I", "MA1101", 4, 1, "odd")]}
    result = validate_plan_constraints(plan, [])
    assert result.is_valid is True


def test_planner_generates_full_plan_for_student():
    payload = generate_study_plan(
        StudentProfile(
            program_studi="Teknologi Sains Data",
            semester_saat_ini=3,
            target_kelulusan_semester=8,
            maks_sks_per_semester=24,
        )
    )
    assert payload.summary.total_credits > 0
    assert min(payload.plan) >= 1
    assert max(payload.plan) <= 8
    assert all(
        course.parity == ("odd" if semester % 2 == 1 else "even")
        for semester, courses in payload.plan.items()
        for course in courses
    )
