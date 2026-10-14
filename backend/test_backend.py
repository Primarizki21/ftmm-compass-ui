from schemas import (
    StudentProfile,
    PlacedCourseModel,
)
from data_loader import get_courses_for_program, normalize_prodi
from tools.prerequisite_validator import validate_plan_constraints
from tools.planner import generate_study_plan


def test_data_loader():
    print("Testing data loader...")
    for alias, expected_name in [
        ("Teknologi Sains Data", "Teknologi Sains Data"),
        ("trkb", "Teknik Robotika dan Kecerdasan Buatan"),
        ("rn", "Rekayasa Nanoteknologi"),
        ("s1 rekayasa nanoteknologi", "Rekayasa Nanoteknologi"),
        ("ti", "Teknik Industri"),
        ("te", "Teknik Elektro"),
    ]:
        assert normalize_prodi(alias) == expected_name
        courses = get_courses_for_program(alias)
        assert len(courses) > 0, f"{expected_name} catalog should not be empty"
        assert all(c.program == expected_name for c in courses)
    print("[PASS] Data loader OK across all 5 official FTMM study programs")

def test_prerequisite_validator():
    print("Testing prerequisite validator...")
    
    # 1. Valid plan test
    valid_plan = {
        1: [
            PlacedCourseModel(
                id="TSD101", code="MA1101", name="Matematika I", credits=4, semester=1,
                type="Wajib", parity="odd", prerequisites=[]
            )
        ],
        2: [
            PlacedCourseModel(
                id="TSD201", code="MA1201", name="Matematika II", credits=4, semester=2,
                type="Wajib", parity="even", prerequisites=["Matematika I"]
            )
        ]
    }
    res_valid = validate_plan_constraints(valid_plan, [])
    assert res_valid.is_valid, f"Expected valid plan, got errors: {res_valid.errors}"
    print("[PASS] Valid plan correctly accepted")

    # 2. Parity violation test (Odd course in even semester)
    parity_violation_plan = {
        2: [
            PlacedCourseModel(
                id="TSD101", code="MA1101", name="Matematika I", credits=4, semester=2,
                type="Wajib", parity="odd", prerequisites=[]
            )
        ]
    }
    res_parity = validate_plan_constraints(parity_violation_plan, [])
    assert not res_parity.is_valid, "Expected parity violation to fail"
    assert any("Semester Ganjil" in e for e in res_parity.errors), "Parity error message missing"
    print("[PASS] Parity violation correctly detected")

    # 3. Missing prerequisite test
    missing_prereq_plan = {
        2: [
            PlacedCourseModel(
                id="TSD201", code="MA1201", name="Matematika II", credits=4, semester=2,
                type="Wajib", parity="even", prerequisites=["Matematika I"]
            )
        ]
    }
    res_prereq = validate_plan_constraints(missing_prereq_plan, [])
    assert not res_prereq.is_valid, "Expected missing prerequisite to fail"
    assert any("Prasyarat tidak terpenuhi" in e for e in res_prereq.errors)
    print("[PASS] Missing prerequisite correctly detected")

    # 4. SKS limit violation test (> maks_sks_per_semester)
    sks_overload_plan = {
        1: [
            PlacedCourseModel(id="M1", code="C1", name="Matkul 1", credits=10, semester=1, type="Wajib", parity="odd"),
            PlacedCourseModel(id="M2", code="C2", name="Matkul 2", credits=10, semester=1, type="Wajib", parity="odd"),
            PlacedCourseModel(id="M3", code="C3", name="Matkul 3", credits=6, semester=1, type="Wajib", parity="odd"),
        ]
    }
    res_sks = validate_plan_constraints(sks_overload_plan, [], maks_sks_per_semester=24)
    assert not res_sks.is_valid, "Expected SKS limit violation to fail"
    assert any("melebihi batas maksimum" in e for e in res_sks.errors)
    print("[PASS] SKS limit overload correctly detected")

    # 5. Multi-religion conflict test
    religion_conflict_plan = {
        1: [
            PlacedCourseModel(id="REL1", code="KU1001", name="Pendidikan Agama Islam", credits=2, semester=1, type="Wajib", parity="odd"),
            PlacedCourseModel(id="REL2", code="KU1003", name="Pendidikan Agama Kristen Protestan", credits=2, semester=1, type="Wajib", parity="odd"),
        ]
    }
    res_rel = validate_plan_constraints(religion_conflict_plan, [])
    assert not res_rel.is_valid, "Expected multi-religion plan to fail"
    assert any("Pelanggaran kurikulum agama" in e for e in res_rel.errors)
    print("[PASS] Multi-religion conflict correctly detected")

    # 6. Duplicate course warning test
    duplicate_plan = {
        1: [PlacedCourseModel(id="DUP1", code="MA1101", name="Matematika I", credits=4, semester=1, type="Wajib", parity="odd")],
        3: [PlacedCourseModel(id="DUP1", code="MA1101", name="Matematika I", credits=4, semester=3, type="Wajib", parity="odd")],
    }
    res_dup = validate_plan_constraints(duplicate_plan, [])
    assert any("terdaftar ganda" in w for w in res_dup.warnings)
    print("[PASS] Duplicate course warning correctly detected")


def test_study_planner():
    print("Testing study planner synthesis...")
    profile = StudentProfile(
        program_studi="Teknologi Sains Data",
        semester_saat_ini=3,
        riwayat_matkul_lulus=["Matematika I", "Fisika Dasar I", "Matematika II", "Dasar Pemrograman", "Aljabar Linear"],
        minat_fokus=["Machine Learning", "Computer Vision"],
        target_kelulusan_semester=7,
        maks_sks_per_semester=24,
        is_confirmed_by_user=True
    )
    payload = generate_study_plan(profile)
    assert payload.action == "APPLY_DEGREE_PLAN"
    assert payload.summary.target_semester == 7
    assert len(payload.plan) >= 7
    print(f"[PASS] Planner synthesized {payload.summary.total_credits} SKS across {len(payload.plan)} semesters")



if __name__ == "__main__":
    test_data_loader()
    test_prerequisite_validator()
    test_study_planner()
    # test_data_loader, test_prerequisite_validator, and test_study_planner verified
    print("\n[DONE] All backend unit tests passed successfully.")
