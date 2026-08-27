import asyncio
from schemas import (
    StudentProfile,
    ChatRequest,
    CourseModel,
    PlacedCourseModel,
)
from data_loader import get_courses_for_program, normalize_prodi
from tools.prerequisite_validator import validate_plan_constraints
from tools.planner import generate_study_plan
from agent import process_chat_message


def test_data_loader():
    print("Testing data loader...")
    courses = get_courses_for_program("Teknologi Sains Data")
    assert len(courses) > 0, "TSD catalog should not be empty"
    
    rpl_courses = get_courses_for_program("rpl")
    assert len(rpl_courses) > 0, "RPL catalog should not be empty"
    print(f"✓ Data loader OK ({len(courses)} TSD courses, {len(rpl_courses)} RPL courses)")


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
    print("✓ Valid plan correctly accepted")

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
    print("✓ Parity violation correctly detected")

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
    print("✓ Missing prerequisite correctly detected")


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
    print(f"✓ Planner synthesized {payload.summary.total_credits} SKS across {len(payload.plan)} semesters")


async def test_slot_filling_agent_dialog():
    print("Testing slot-filling agent dialog flow...")
    profile = StudentProfile()

    # Step 1: User gives partial intent
    req1 = ChatRequest(
        message="Halo, saya ingin buat study plan untuk semester depan.",
        student_profile=profile
    )
    res1 = await process_chat_message(req1)
    assert res1.action_type == "NEED_INFO"
    assert len(res1.missing_slots) > 0
    print("✓ Step 1: Agent strictly requests missing slots without making assumptions")

    # Step 2: User provides prodi, semester, and interests
    req2 = ChatRequest(
        message="Saya mahasiswa Sains Data semester 3. Mau fokus ke Machine Learning dan Computer Vision.",
        student_profile=res1.updated_profile
    )
    res2 = await process_chat_message(req2)
    assert res2.updated_profile.program_studi == "Teknologi Sains Data"
    assert res2.updated_profile.semester_saat_ini == 3
    assert "Machine Learning" in res2.updated_profile.minat_fokus
    assert res2.action_type == "CONFIRM_PROFILE"
    print("✓ Step 2: Agent extracts slots and asks for confirmation")

    # Step 3: User confirms
    req3 = ChatRequest(
        message="Ya sudah benar, buatkan rencananya.",
        student_profile=res2.updated_profile
    )
    res3 = await process_chat_message(req3)
    assert res3.action_type == "PLAN_GENERATED"
    assert res3.plan_payload is not None
    assert res3.plan_payload.action == "APPLY_DEGREE_PLAN"
    print("✓ Step 3: Agent executes planner tool and returns valid DegreePlanPayload")


if __name__ == "__main__":
    test_data_loader()
    test_prerequisite_validator()
    test_study_planner()
    asyncio.run(test_slot_filling_agent_dialog())
    print("\nAll backend unit tests passed successfully! 🎉")
