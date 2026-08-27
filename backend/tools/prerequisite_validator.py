from typing import Dict, List, Set, Tuple
from schemas import PlacedCourseModel, PlanValidationResponse


def normalize_title(title: str) -> str:
    return "".join(c.lower() for c in title if c.isalnum())


def is_course_completed(prereq_name: str, completed_set: Set[str]) -> bool:
    norm_prereq = normalize_title(prereq_name)
    for c in completed_set:
        if norm_prereq in normalize_title(c) or normalize_title(c) in norm_prereq:
            return True
    return False


def validate_plan_constraints(
    plan: Dict[int, List[PlacedCourseModel]],
    riwayat_matkul_lulus: List[str],
    maks_sks_per_semester: int = 24,
) -> PlanValidationResponse:
    """
    Deterministically validates prerequisite DAG, semester parity, and SKS limits.
    """
    errors: List[str] = []
    warnings: List[str] = []
    semester_credits: Dict[int, int] = {}
    total_credits = 0

    # Accumulate courses completed prior to starting the plan
    completed_so_far: Set[str] = set(riwayat_matkul_lulus)
    scheduled_ids: Set[str] = set()

    for sem in sorted(plan.keys()):
        courses = plan[sem]
        current_sem_credits = 0
        is_odd_sem = (sem % 2 == 1)

        for course in courses:
            # 1. Parity Check
            if course.parity == "odd" and not is_odd_sem:
                errors.append(
                    f"Mata kuliah '{course.name}' adalah matkul Semester Ganjil (odd), tidak boleh diambil di Semester {sem} (Genap)."
                )
            elif course.parity == "even" and is_odd_sem:
                errors.append(
                    f"Mata kuliah '{course.name}' adalah matkul Semester Genap (even), tidak boleh diambil di Semester {sem} (Ganjil)."
                )

            # 2. Prerequisite Check (only if not already completed in prior history)
            if course.status != "completed":
                for prereq in course.prerequisites:
                    if not is_course_completed(prereq, completed_so_far):
                        errors.append(
                            f"Prasyarat tidak terpenuhi: '{course.name}' (Sem {sem}) membutuhkan '{prereq}', yang belum lulus atau belum dijadwalkan di semester sebelumnya."
                        )

            # 3. Duplicate check
            course_key = f"{course.id}_{normalize_title(course.name)}"
            if course_key in scheduled_ids:
                warnings.append(
                    f"Mata kuliah '{course.name}' terdaftar ganda di lebih dari satu semester."
                )
            scheduled_ids.add(course_key)

            current_sem_credits += course.credits
            total_credits += course.credits

        semester_credits[sem] = current_sem_credits

        # 4. SKS Limit Check
        if current_sem_credits > maks_sks_per_semester:
            errors.append(
                f"Semester {sem} memiliki {current_sem_credits} SKS, melebihi batas maksimum {maks_sks_per_semester} SKS."
            )
        elif current_sem_credits > 22:
            warnings.append(
                f"Semester {sem} memiliki beban tinggi ({current_sem_credits} SKS). Pastikan IPK semester sebelumnya mencukupi."
            )

        # After processing this semester, all its courses are considered completed for future semesters
        for course in courses:
            completed_so_far.add(course.name)
            if course.code:
                completed_so_far.add(course.code)
            completed_so_far.add(course.id)

    return PlanValidationResponse(
        is_valid=(len(errors) == 0),
        errors=errors,
        warnings=warnings,
        total_credits=total_credits,
        semester_credits=semester_credits,
    )
