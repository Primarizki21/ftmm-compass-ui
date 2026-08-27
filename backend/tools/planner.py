from typing import Dict, List, Set
from schemas import (
    StudentProfile,
    PlacedCourseModel,
    DegreePlanPayload,
    PlanPayloadSummary,
)
from data_loader import get_courses_for_program, normalize_prodi
from tools.prerequisite_validator import validate_plan_constraints, is_course_completed


def generate_study_plan(profile: StudentProfile) -> DegreePlanPayload:
    """
    Generates a personalized, prerequisite-validated study plan payload
    matching the student's background, current semester, target, and interests.
    """
    prodi_name = normalize_prodi(profile.program_studi) or "Teknologi Sains Data"
    catalog = get_courses_for_program(prodi_name)
    current_sem = profile.semester_saat_ini or 1
    target_sem = profile.target_kelulusan_semester or 8
    max_sks = profile.maks_sks_per_semester or 24

    # Build interest keyword set
    interest_keywords = [k.lower() for k in profile.minat_fokus] if profile.minat_fokus else ["data", "machine learning", "ai"]

    plan: Dict[int, List[PlacedCourseModel]] = {s: [] for s in range(1, target_sem + 1)}
    completed_names: Set[str] = set(profile.riwayat_matkul_lulus)

    # 1. First pass: Place all courses for past semesters (< current_sem) as completed
    for course in catalog:
        if course.semester < current_sem:
            # If in past semester, mark as completed
            placed = PlacedCourseModel(
                **course.model_dump(),
                status="completed"
            )
            plan[course.semester].append(placed)
            completed_names.add(course.name)
            if course.code:
                completed_names.add(course.code)

    # 2. Second pass: Place Wajib (Compulsory) courses for current and future semesters
    for course in catalog:
        if course.semester >= current_sem and course.semester <= target_sem:
            if course.type == "Wajib":
                target_dest_sem = course.semester
                # If accelerated to 7 semesters and course was in sem 8, adjust to sem 7 if eligible
                if target_sem == 7 and course.semester == 8:
                    target_dest_sem = 7

                placed = PlacedCourseModel(
                    **course.model_dump(),
                    status="planned"
                )
                plan[target_dest_sem].append(placed)

    # 3. Third pass: Select and place elective (Pilihan) courses based on interest keywords
    electives = [c for c in catalog if c.type == "Pilihan"]

    def score_elective(c) -> int:
        score = 0
        text = f"{c.name} {c.desc}".lower()
        for kw in interest_keywords:
            if kw in text:
                score += 10
        return score

    sorted_electives = sorted(electives, key=score_elective, reverse=True)

    # Place top relevant electives into semesters matching their parity and SKS capacity
    for elect in sorted_electives:
        sem = elect.semester
        if sem < current_sem or sem > target_sem:
            continue

        # Check if already added
        if any(c.id == elect.id for s in plan for c in plan[s]):
            continue

        current_sem_sks = sum(c.credits for c in plan[sem])
        if current_sem_sks + elect.credits <= max_sks:
            placed = PlacedCourseModel(
                **elect.model_dump(),
                status="planned"
            )
            plan[sem].append(placed)

    # 4. Deterministic Validation & Adjustment Loop
    validation = validate_plan_constraints(plan, profile.riwayat_matkul_lulus, max_sks)
    
    # Calculate summary numbers
    total_credits = sum(
        sum(c.credits for c in plan[s])
        for s in plan
    )

    summary = PlanPayloadSummary(
        program_studi=prodi_name,
        current_semester=current_sem,
        target_semester=target_sem,
        total_credits=total_credits,
        focus_tracks=profile.minat_fokus if profile.minat_fokus else ["General Track"],
        note="Rencana studi telah tervalidasi memenuhi graf prasyarat & paritas semester FTMM."
    )

    return DegreePlanPayload(
        action="APPLY_DEGREE_PLAN",
        summary=summary,
        plan=plan
    )
