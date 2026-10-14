from typing import Dict, List, Set
from schemas import PlacedCourseModel, PlanValidationResponse


def normalize_title(title: str) -> str:
    return "".join(c.lower() for c in title if c.isalnum())


def is_course_completed(prereq_name: str, completed_set: Set[str]) -> bool:
    norm_prereq = normalize_title(prereq_name)
    for c in completed_set:
        if norm_prereq in normalize_title(c) or normalize_title(c) in norm_prereq:
            return True
    return False

def extract_religion_type(course_name: str, course_code: str | None = None) -> str | None:
    text = f"{course_code or ''} {course_name}".lower()
    has_agama = "agama" in text or any(k in text for k in ["agi", "agk", "agp", "agh", "agb", "agc"])
    if not has_agama:
        return None
    if "islam" in text or "agi" in (course_code or "").lower():
        return "Islam"
    if "katolik" in text or "agk" in (course_code or "").lower():
        return "Katolik"
    if "protestan" in text or "kristen" in text or "agp" in (course_code or "").lower():
        return "Protestan"
    if "hindu" in text or "agh" in (course_code or "").lower():
        return "Hindu"
    if "buddha" in text or "budha" in text or "agb" in (course_code or "").lower():
        return "Buddha"
    if "khonghucu" in text or "konghucu" in text or "agc" in (course_code or "").lower():
        return "Khonghucu"
    return "Umum"


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

    # 4. Max 1 Religion Type Constraint
    religions_found: Dict[str, List[str]] = {}
    for sem_num, sem_courses in plan.items():
        for c in sem_courses:
            rel = extract_religion_type(c.name, c.code)
            if rel and rel != "Umum":
                if rel not in religions_found:
                    religions_found[rel] = []
                religions_found[rel].append(f"{c.name} (Sem {sem_num})")

    for prev_name in riwayat_matkul_lulus:
        rel = extract_religion_type(prev_name)
        if rel and rel != "Umum":
            if rel not in religions_found:
                religions_found[rel] = []
            religions_found[rel].append(f"{prev_name} (Riwayat Lulus)")

    if len(religions_found) > 1:
        details = ", ".join(
            f"Agama {r}: {', '.join(items)}" for r, items in sorted(religions_found.items())
        )
        errors.append(
            f"Pelanggaran kurikulum agama: Mahasiswa hanya diperbolehkan mengambil 1 jenis mata kuliah agama. Terdeteksi {len(religions_found)} jenis agama dalam rencana studi: {details}."
        )

    return PlanValidationResponse(
        is_valid=(len(errors) == 0),
        errors=errors,
        warnings=warnings,
        total_credits=total_credits,
        semester_credits=semester_credits,
    )
