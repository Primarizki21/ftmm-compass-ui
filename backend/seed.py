import asyncio
import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import AsyncSessionLocal
from models import (
    StudyProgram,
    User,
    StudentProfile,
    AcademicPeriod,
    Course,
    Curriculum,
    CurriculumCourse,
    StudentCurriculumAssignment,
    StudentCourseRecord,
    CourseOffering,
    CourseOfferingEligibility,
    OfferingComponent,
    ClassSection,
    ClassSchedule,
    Timetable,
    TimetableItem,
    ElectivePollingPeriod,
    ElectiveCourseVote,
    UserNotification,
)
from auth import get_password_hash

PRODIS = [
    {
        "program_code": "TSD",
        "program_name": "Teknologi Sains Data",
        "degree_level": "sarjana",
    },
    {
        "program_code": "TRKB",
        "program_name": "Teknik Robotika & Kecerdasan Buatan",
        "degree_level": "sarjana",
    },
    {
        "program_code": "RN",
        "program_name": "Rekayasa Nanoteknologi",
        "degree_level": "sarjana",
    },
    {
        "program_code": "TI",
        "program_name": "Teknik Industri",
        "degree_level": "sarjana",
    },
    {
        "program_code": "TE",
        "program_name": "Teknik Elektro",
        "degree_level": "sarjana",
    },
]

COURSES_DATA = [
    # Sem 1 (2023 Ganjil) - Passed
    {"code": "KIK101", "name": "Kalkulus I", "credits": 3, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "KIK102", "name": "Fisika Dasar", "credits": 3, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "TSD101", "name": "Pengantar Sains Data", "credits": 3, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "PDB101", "name": "Bahasa Indonesia Akademik", "credits": 2, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "PDB102", "name": "Pendidikan Kewarganegaraan", "credits": 2, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "PDB103", "name": "Agama Islam I", "credits": 2, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "KIK104", "name": "Kimia Dasar", "credits": 3, "sem": 1, "term": "ganjil", "type": "wajib"},
    {"code": "TSD103", "name": "Logika Pemrograman", "credits": 4, "sem": 1, "term": "ganjil", "type": "wajib"},

    # Sem 2 (2023 Genap) - Passed
    {"code": "KIK103", "name": "Kalkulus II", "credits": 3, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "TSD102", "name": "Statistika Deskriptif", "credits": 3, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "TSD104", "name": "Pemrograman Python Lanjut", "credits": 3, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "TSD105", "name": "Aljabar Linier Elementer", "credits": 3, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "PDB104", "name": "Bahasa Inggris Komunikasi", "credits": 2, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "PDB105", "name": "Pancasila", "credits": 2, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "TSD106", "name": "Etika & Regulasi Data", "credits": 2, "sem": 2, "term": "genap", "type": "wajib"},
    {"code": "TSD107", "name": "Komputasi Numerik", "credits": 4, "sem": 2, "term": "genap", "type": "wajib"},

    # Sem 3 (2024 Ganjil) - Taking
    {"code": "TSD201", "name": "Algoritma & Struktur Data", "credits": 3, "sem": 3, "term": "ganjil", "type": "wajib"},
    {"code": "TSD202", "name": "Statistika Inferensial", "credits": 3, "sem": 3, "term": "ganjil", "type": "wajib"},
    {"code": "TSD203", "name": "Basis Data Sains Data", "credits": 3, "sem": 3, "term": "ganjil", "type": "wajib"},
    {"code": "TSD204", "name": "Matematika Diskrit", "credits": 3, "sem": 3, "term": "ganjil", "type": "wajib"},
    {"code": "TSD205", "name": "Organisasi & Arsitektur Komputer", "credits": 3, "sem": 3, "term": "ganjil", "type": "wajib"},
    {"code": "TSD206", "name": "Kalkulus Multivariabel", "credits": 2, "sem": 3, "term": "ganjil", "type": "wajib"},

    # Sem 5 (Mata Kuliah Dosen Pengajar Dr. Hendra)
    {"code": "TSD301", "name": "Penambangan Data", "credits": 3, "sem": 5, "term": "ganjil", "type": "wajib"},
    {"code": "TSD302", "name": "Pembelajaran Mesin", "credits": 3, "sem": 5, "term": "ganjil", "type": "wajib"},
    {"code": "TSD303", "name": "Sains Data Spasial", "credits": 3, "sem": 5, "term": "ganjil", "type": "pilihan"},

    # Sem 6 (Pilihan untuk Wishlist / Pre-KRS)
    {"code": "TSD401", "name": "Pemrosesan Bahasa Alami", "credits": 3, "sem": 6, "term": "genap", "type": "pilihan"},
    {"code": "TSD402", "name": "Sistem Rekomendasi", "credits": 3, "sem": 6, "term": "genap", "type": "pilihan"},
    {"code": "TSD403", "name": "Komputasi Awan", "credits": 3, "sem": 6, "term": "genap", "type": "pilihan"},
]


async def seed_data():
    async with AsyncSessionLocal() as session:
        print("[SEED 1/8] Checking and seeding Study Programs...")
        prodi_map = {}
        for p_data in PRODIS:
            stmt = select(StudyProgram).where(StudyProgram.program_code == p_data["program_code"])
            res = await session.execute(stmt)
            prodi = res.scalars().first()
            if not prodi:
                prodi = StudyProgram(
                    program_code=p_data["program_code"],
                    program_name=p_data["program_name"],
                    degree_level=p_data["degree_level"],
                    is_active=True,
                )
                session.add(prodi)
                await session.flush()
                print(f"  [CREATED] Study program: {prodi.program_code} - {prodi.program_name}")
            else:
                print(f"  [EXISTS] Study program: {prodi.program_code}")
            prodi_map[prodi.program_code] = prodi

        print("\n[SEED 2/8] Checking and seeding Academic Periods...")
        period_configs = [
            {"year": 2023, "term": "ganjil", "active": False},
            {"year": 2023, "term": "genap", "active": False},
            {"year": 2024, "term": "ganjil", "active": True},
        ]
        period_map = {}
        for pcfg in period_configs:
            stmt = select(AcademicPeriod).where(
                AcademicPeriod.academic_year_start == pcfg["year"],
                AcademicPeriod.term == pcfg["term"],
            )
            p_obj = (await session.execute(stmt)).scalars().first()
            if not p_obj:
                p_obj = AcademicPeriod(
                    academic_year_start=pcfg["year"],
                    term=pcfg["term"],
                    is_active=pcfg["active"],
                )
                session.add(p_obj)
                await session.flush()
                print(f"  [CREATED] Academic period: {pcfg['year']} {pcfg['term']} (active: {pcfg['active']})")
            else:
                p_obj.is_active = pcfg["active"]
                print(f"  [EXISTS] Academic period: {pcfg['year']} {pcfg['term']}")
            period_map[f"{pcfg['year']}_{pcfg['term']}"] = p_obj

        active_period = period_map["2024_ganjil"]

        print("\n[SEED 3/8] Checking and seeding Test Users...")

        # 1. Admin
        admin_email = "admin@ftmm.unair.ac.id"
        stmt = select(User).where(User.email == admin_email)
        admin_user = (await session.execute(stmt)).scalars().first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                full_name="Super Admin FTMM",
                role="admin",
                password_hash=get_password_hash("AdminFTMM2026!"),
                is_active=True,
            )
            session.add(admin_user)
            await session.flush()
            print(f"  [CREATED] Admin user: {admin_email}")
        else:
            admin_user.password_hash = get_password_hash("AdminFTMM2026!")
            admin_user.full_name = "Super Admin FTMM"
            print(f"  [EXISTS] Admin user: {admin_email}")

        # 2. Mahasiswa
        mhs_email = "mahasiswa.testing@ftmm.unair.ac.id"
        stmt = (
            select(User)
            .options(selectinload(User.student_profile))
            .where(User.email == mhs_email)
        )
        mhs_user = (await session.execute(stmt)).scalars().first()
        tsd_prodi = prodi_map.get("TSD")
        if not mhs_user:
            mhs_user = User(
                email=mhs_email,
                full_name="Budi Santoso",
                role="student",
                password_hash=get_password_hash("Mahasiswa2026!"),
                is_active=True,
            )
            session.add(mhs_user)
            await session.flush()

            profile = StudentProfile(
                user_id=mhs_user.user_id,
                study_program_id=tsd_prodi.study_program_id,
                student_number="164231001",
                admission_year=2023,
                current_semester=3,
            )
            session.add(profile)
            print(f"  [CREATED] Mahasiswa user: {mhs_email} with NIM 164231001")
        else:
            mhs_user.password_hash = get_password_hash("Mahasiswa2026!")
            mhs_user.full_name = "Budi Santoso"
            if not mhs_user.student_profile:
                profile = StudentProfile(
                    user_id=mhs_user.user_id,
                    study_program_id=tsd_prodi.study_program_id,
                    student_number="164231001",
                    admission_year=2023,
                    current_semester=3,
                )
                session.add(profile)
            print(f"  [EXISTS] Mahasiswa user: {mhs_email}")

        # 3. Dosen
        dosen_email = "dosen.testing@ftmm.unair.ac.id"
        stmt = select(User).where(User.email == dosen_email)
        dosen_user = (await session.execute(stmt)).scalars().first()
        if not dosen_user:
            dosen_user = User(
                email=dosen_email,
                full_name="Dr. Ir. Hendra Kurniawan, S.T., M.T.",
                role="lecturer",
                password_hash=get_password_hash("DosenFTMM2026!"),
                is_active=True,
            )
            session.add(dosen_user)
            await session.flush()
            print(f"  [CREATED] Dosen user: {dosen_email}")
        else:
            dosen_user.password_hash = get_password_hash("DosenFTMM2026!")
            dosen_user.full_name = "Dr. Ir. Hendra Kurniawan, S.T., M.T."
            print(f"  [EXISTS] Dosen user: {dosen_email}")

        print("\n[SEED 4/8] Checking and seeding Curriculum & Courses...")
        stmt_curr = select(Curriculum).where(
            Curriculum.study_program_id == tsd_prodi.study_program_id,
            Curriculum.curriculum_year == 2023,
        )
        curriculum = (await session.execute(stmt_curr)).scalars().first()
        if not curriculum:
            curriculum = Curriculum(
                study_program_id=tsd_prodi.study_program_id,
                curriculum_name="Kurikulum TSD 2023",
                curriculum_year=2023,
                minimum_graduation_credits=144,
                standard_duration_semesters=8,
                is_active=True,
            )
            session.add(curriculum)
            await session.flush()
            print("  [CREATED] Curriculum: Kurikulum TSD 2023")
        else:
            print("  [EXISTS] Curriculum: Kurikulum TSD 2023")

        # Assign curriculum to student
        stmt_assign = select(StudentCurriculumAssignment).where(
            StudentCurriculumAssignment.user_id == mhs_user.user_id,
            StudentCurriculumAssignment.curriculum_id == curriculum.curriculum_id,
        )
        assignment = (await session.execute(stmt_assign)).scalars().first()
        if not assignment:
            assignment = StudentCurriculumAssignment(
                user_id=mhs_user.user_id,
                curriculum_id=curriculum.curriculum_id,
                is_current=True,
            )
            session.add(assignment)
            await session.flush()
            print(f"  [ASSIGNED] Curriculum to student: {mhs_user.email}")

        # Seed Courses and Curriculum Courses
        course_map = {}
        curriculum_course_map = {}
        for cdata in COURSES_DATA:
            stmt_c = select(Course).where(Course.course_code == cdata["code"])
            c_obj = (await session.execute(stmt_c)).scalars().first()
            if not c_obj:
                c_obj = Course(
                    course_code=cdata["code"],
                    course_name=cdata["name"],
                    is_active=True,
                )
                session.add(c_obj)
                await session.flush()
            course_map[cdata["code"]] = c_obj

            stmt_cc = select(CurriculumCourse).where(
                CurriculumCourse.curriculum_id == curriculum.curriculum_id,
                CurriculumCourse.course_id == c_obj.course_id,
            )
            cc_obj = (await session.execute(stmt_cc)).scalars().first()
            if not cc_obj:
                cc_obj = CurriculumCourse(
                    curriculum_id=curriculum.curriculum_id,
                    course_id=c_obj.course_id,
                    credits_total=cdata["credits"],
                    recommended_semester=cdata["sem"],
                    term=cdata["term"],
                    course_type=cdata["type"],
                    course_scope="program_studi",
                    is_active=True,
                )
                session.add(cc_obj)
                await session.flush()
            curriculum_course_map[cdata["code"]] = cc_obj

        print(f"  [OK] Verified and mapped {len(COURSES_DATA)} courses in curriculum")

        print("\n[SEED 5/8] Checking and seeding Student Course Records (Transkrip Akademik)...")
        # Sem 1 grades (total 22 SKS, IP 3.86)
        sem1_records = [
            ("KIK101", "A"),
            ("KIK102", "AB"),
            ("TSD101", "A"),
            ("PDB101", "A"),
            ("PDB102", "A"),
            ("PDB103", "A"),
            ("KIK104", "AB"),
            ("TSD103", "A"),
        ]
        p_2023_ganjil = period_map["2023_ganjil"]
        for code, grade in sem1_records:
            cc = curriculum_course_map[code]
            stmt_r = select(StudentCourseRecord).where(
                StudentCourseRecord.user_id == mhs_user.user_id,
                StudentCourseRecord.curriculum_course_id == cc.curriculum_course_id,
                StudentCourseRecord.academic_period_id == p_2023_ganjil.academic_period_id,
            )
            rec = (await session.execute(stmt_r)).scalars().first()
            if not rec:
                rec = StudentCourseRecord(
                    user_id=mhs_user.user_id,
                    student_curriculum_assignment_id=assignment.student_curriculum_assignment_id,
                    curriculum_course_id=cc.curriculum_course_id,
                    academic_period_id=p_2023_ganjil.academic_period_id,
                    record_status="passed",
                    final_grade=grade,
                )
                session.add(rec)

        # Sem 2 grades (total 22 SKS, IP 3.78)
        sem2_records = [
            ("KIK103", "A"),
            ("TSD102", "A"),
            ("TSD104", "AB"),
            ("TSD105", "B"),
            ("PDB104", "A"),
            ("PDB105", "A"),
            ("TSD106", "A"),
            ("TSD107", "AB"),
        ]
        p_2023_genap = period_map["2023_genap"]
        for code, grade in sem2_records:
            cc = curriculum_course_map[code]
            stmt_r = select(StudentCourseRecord).where(
                StudentCourseRecord.user_id == mhs_user.user_id,
                StudentCourseRecord.curriculum_course_id == cc.curriculum_course_id,
                StudentCourseRecord.academic_period_id == p_2023_genap.academic_period_id,
            )
            rec = (await session.execute(stmt_r)).scalars().first()
            if not rec:
                rec = StudentCourseRecord(
                    user_id=mhs_user.user_id,
                    student_curriculum_assignment_id=assignment.student_curriculum_assignment_id,
                    curriculum_course_id=cc.curriculum_course_id,
                    academic_period_id=p_2023_genap.academic_period_id,
                    record_status="passed",
                    final_grade=grade,
                )
                session.add(rec)

        # Sem 3 taking (20 SKS)
        sem3_codes = ["TSD201", "TSD202", "TSD203", "TSD204", "TSD205", "TSD206"]
        for code in sem3_codes:
            cc = curriculum_course_map[code]
            stmt_r = select(StudentCourseRecord).where(
                StudentCourseRecord.user_id == mhs_user.user_id,
                StudentCourseRecord.curriculum_course_id == cc.curriculum_course_id,
                StudentCourseRecord.academic_period_id == active_period.academic_period_id,
            )
            rec = (await session.execute(stmt_r)).scalars().first()
            if not rec:
                rec = StudentCourseRecord(
                    user_id=mhs_user.user_id,
                    student_curriculum_assignment_id=assignment.student_curriculum_assignment_id,
                    curriculum_course_id=cc.curriculum_course_id,
                    academic_period_id=active_period.academic_period_id,
                    record_status="taking",
                    final_grade=None,
                )
                session.add(rec)

        await session.flush()
        print("  [OK] Seeded 16 passed records (44 SKS lulus, IPK 3.82) and 6 active records (20 SKS taking)")

        print("\n[SEED 6/8] Checking and seeding Timetables & Class Schedules...")
        # Timetable for student
        stmt_tt = select(Timetable).where(
            Timetable.user_id == mhs_user.user_id,
            Timetable.academic_period_id == active_period.academic_period_id,
        )
        timetable = (await session.execute(stmt_tt)).scalars().first()
        if not timetable:
            timetable = Timetable(
                user_id=mhs_user.user_id,
                student_curriculum_assignment_id=assignment.student_curriculum_assignment_id,
                academic_period_id=active_period.academic_period_id,
                timetable_name="Jadwal Utama Semester 3",
                is_active=False,
            )
            session.add(timetable)
            await session.flush()
            print("  [CREATED] Timetable for student")

        # Class schedules for Sem 3
        # Day: 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat
        schedule_configs = [
            {
                "code": "TSD201",
                "section": "A",
                "day": 1,
                "start": datetime.time(8, 0),
                "end": datetime.time(10, 30),
                "room": "Lab Komputasi A (Gedung Nano Lt. 2)",
                "lecturer_user": dosen_user,
            },
            {
                "code": "TSD202",
                "section": "A",
                "day": 2,
                "start": datetime.time(8, 0),
                "end": datetime.time(10, 30),
                "room": "Ruang Kuliah 3.01 (Gedung Nano)",
                "lecturer_user": None,
            },
            {
                "code": "TSD203",
                "section": "A",
                "day": 2,
                "start": datetime.time(13, 0),
                "end": datetime.time(15, 30),
                "room": "Lab Komputasi B (Gedung Nano Lt. 2)",
                "lecturer_user": None,
            },
            {
                "code": "TSD204",
                "section": "A",
                "day": 3,
                "start": datetime.time(10, 0),
                "end": datetime.time(12, 30),
                "room": "Ruang Kuliah 3.02 (Gedung Nano)",
                "lecturer_user": None,
            },
            {
                "code": "TSD205",
                "section": "A",
                "day": 4,
                "start": datetime.time(8, 0),
                "end": datetime.time(10, 30),
                "room": "Ruang Kuliah 2.04 (Gedung Nano)",
                "lecturer_user": None,
            },
            {
                "code": "TSD206",
                "section": "A",
                "day": 4,
                "start": datetime.time(13, 0),
                "end": datetime.time(14, 40),
                "room": "Ruang Kuliah 3.01 (Gedung Nano)",
                "lecturer_user": None,
            },
            # Dosen schedules (Semester 5 courses taught by Hendra)
            {
                "code": "TSD302",
                "section": "A",
                "day": 3,
                "start": datetime.time(13, 0),
                "end": datetime.time(15, 30),
                "room": "Ruang Kuliah 3.01 (Gedung Nano)",
                "lecturer_user": dosen_user,
            },
            {
                "code": "TSD301",
                "section": "B",
                "day": 5,
                "start": datetime.time(8, 0),
                "end": datetime.time(10, 30),
                "room": "Lab Komputasi A (Gedung Nano Lt. 2)",
                "lecturer_user": dosen_user,
            },
        ]

        for scfg in schedule_configs:
            c_obj = course_map[scfg["code"]]
            # 1. Offering
            stmt_off = select(CourseOffering).where(
                CourseOffering.academic_period_id == active_period.academic_period_id,
                CourseOffering.course_id == c_obj.course_id,
            )
            offering = (await session.execute(stmt_off)).scalars().first()
            if not offering:
                offering = CourseOffering(
                    academic_period_id=active_period.academic_period_id,
                    course_id=c_obj.course_id,
                    offering_code=f"{scfg['code']}-2024-GANJIL",
                )
                session.add(offering)
                await session.flush()

            # 1b. Course Offering Eligibility for Curriculum
            cc_obj = curriculum_course_map[scfg["code"]]
            stmt_coe = select(CourseOfferingEligibility).where(
                CourseOfferingEligibility.course_offering_id == offering.course_offering_id,
                CourseOfferingEligibility.curriculum_course_id == cc_obj.curriculum_course_id,
            )
            coe = (await session.execute(stmt_coe)).scalars().first()
            if not coe:
                coe = CourseOfferingEligibility(
                    course_offering_id=offering.course_offering_id,
                    curriculum_course_id=cc_obj.curriculum_course_id,
                )
                session.add(coe)
                await session.flush()

            # 2. Offering Component
            stmt_comp = select(OfferingComponent).where(
                OfferingComponent.course_offering_id == offering.course_offering_id,
                OfferingComponent.component_code == "KULIAH",
            )
            comp = (await session.execute(stmt_comp)).scalars().first()
            if not comp:
                comp = OfferingComponent(
                    course_offering_id=offering.course_offering_id,
                    component_code="KULIAH",
                    component_type="lecture",
                )
                session.add(comp)
                await session.flush()

            # 3. Class Section
            stmt_sec = select(ClassSection).where(
                ClassSection.offering_component_id == comp.offering_component_id,
                ClassSection.section_code == scfg["section"],
            )
            sec = (await session.execute(stmt_sec)).scalars().first()
            if not sec:
                sec = ClassSection(
                    offering_component_id=comp.offering_component_id,
                    section_code=scfg["section"],
                    capacity=40,
                    enrollment_status="open",
                )
                session.add(sec)
                await session.flush()

            # 4. Class Schedule
            stmt_cs = select(ClassSchedule).where(
                ClassSchedule.class_section_id == sec.class_section_id,
                ClassSchedule.day_of_week == scfg["day"],
                ClassSchedule.start_time == scfg["start"],
            )
            cs = (await session.execute(stmt_cs)).scalars().first()
            if not cs:
                cs = ClassSchedule(
                    class_section_id=sec.class_section_id,
                    day_of_week=scfg["day"],
                    start_time=scfg["start"],
                    end_time=scfg["end"],
                    room_name=scfg["room"],
                )
                session.add(cs)
                await session.flush()

            # If it's a student course, attach to student's timetable
            if scfg["code"] in sem3_codes:
                stmt_ti = select(TimetableItem).where(
                    TimetableItem.timetable_id == timetable.timetable_id,
                    TimetableItem.class_section_id == sec.class_section_id,
                )
                ti = (await session.execute(stmt_ti)).scalars().first()
                if not ti:
                    ti = TimetableItem(
                        timetable_id=timetable.timetable_id,
                        class_section_id=sec.class_section_id,
                    )
                    session.add(ti)

        await session.flush()
        timetable.is_active = True
        await session.flush()
        print("  [OK] Activated student timetable with scheduled class items")
        print("  [OK] Seeded course offerings, sections, schedules, and timetable items")

        print("\n[SEED 7/8] Checking and seeding Active Polling Period & Wishlist Votes...")
        stmt_poll = select(ElectivePollingPeriod).where(ElectivePollingPeriod.status == "open")
        polling_period = (await session.execute(stmt_poll)).scalars().first()
        if not polling_period:
            polling_period = ElectivePollingPeriod(
                title="Polling Peminatan MK Pilihan Semester Genap 2024/2025",
                academic_year="2024/2025",
                target_term="genap",
                target_semester=4,
                start_date=datetime.datetime.now(datetime.timezone.utc),
                end_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30),
                status="open",
                min_quota_threshold=15,
                max_votes_per_student=3,
                description="Periode polling resmi mahasiswa FTMM untuk proyeksi kelas pilihan semester genap.",
            )
            session.add(polling_period)
            await session.flush()
            print(f"  [CREATED] Active Polling Period: {polling_period.title}")
        else:
            print(f"  [EXISTS] Active Polling Period: {polling_period.title}")

        # 7a. Seed realistic elective votes from students
        voter_users = [mhs_user]
        for i in range(1, 46):
            v_email = f"student.voter{i:02d}@ftmm.unair.ac.id"
            stmt_vu = select(User).where(User.email == v_email)
            vu = (await session.execute(stmt_vu)).scalars().first()
            if not vu:
                vu = User(
                    email=v_email,
                    full_name=f"Mahasiswa Pemilih {i:02d}",
                    role="student",
                    password_hash=get_password_hash("VoterPass2026!"),
                    is_active=True,
                )
                session.add(vu)
                await session.flush()
            voter_users.append(vu)

        vote_distributions = [
            {"code": "SIC304", "name": "Natural Language Processing", "credits": 3, "count": 42},
            {"code": "SID307", "name": "Teknologi Big Data", "credits": 3, "count": 35},
            {"code": "RKK304", "name": "Deep Learning", "credits": 3, "count": 28},
            {"code": "MAS317", "name": "Analisis Data Spasial", "credits": 3, "count": 18},
            {"code": "RKS305", "name": "Autonomous Vehicle", "credits": 3, "count": 16},
            {"code": "TEL302", "name": "Elektronika Daya", "credits": 3, "count": 14},
            {"code": "RNT201", "name": "Nanoteknologi Pertanian dan Pemrosesan Makanan", "credits": 2, "count": 12},
            {"code": "MNU215", "name": "Bisnis dan Komersialisasi Nanoteknologi", "credits": 2, "count": 8},
        ]

        for dist in vote_distributions:
            for idx in range(dist["count"]):
                user_voter = voter_users[idx % len(voter_users)]
                stmt_chk = select(ElectiveCourseVote).where(
                    ElectiveCourseVote.polling_period_id == polling_period.polling_period_id,
                    ElectiveCourseVote.user_id == user_voter.user_id,
                    ElectiveCourseVote.course_id == dist["code"],
                )
                v_exists = (await session.execute(stmt_chk)).scalars().first()
                if not v_exists:
                    p_val = 1 if idx < dist["count"] // 2 else (2 if idx < (dist["count"] * 4) // 5 else 3)
                    new_v = ElectiveCourseVote(
                        polling_period_id=polling_period.polling_period_id,
                        user_id=user_voter.user_id,
                        course_id=dist["code"],
                        course_code=dist["code"],
                        course_name=dist["name"],
                        credits=dist["credits"],
                        priority=p_val,
                    )
                    session.add(new_v)
        await session.flush()
        print(f"  [OK] Seeded {len(vote_distributions)} elective courses with realistic student quorum votes")

        # 8. Seed persistent notifications for each role
        print("\n[SEED 8/8] Checking and seeding Persistent Notifications...")
        notifications_seed_data = [
            # Student notifications
            {
                "target_role": "student",
                "title": "Deteksi Bentrok Jadwal Kuliah",
                "message": "Terdapat bentrok jadwal antara II4042 (Machine Learning) dan II4045 (Data Visualization) pada Selasa 10:00.",
                "type": "warning",
                "is_read": False,
                "action_url": "dashboard",
            },
            {
                "target_role": "student",
                "title": "Batas Akhir Revisi KRS (PRS)",
                "message": "Periode perubahan rencana studi semester aktif ditutup pada 30 Agustus 2024 pukul 23:59 WIB.",
                "type": "deadline",
                "is_read": False,
                "action_url": "dashboard",
            },
            {
                "target_role": "student",
                "title": "Hasil Polling Peminatan MK Pilihan",
                "message": "Mata kuliah pilihan yang kamu vote (SIC304 - Natural Language Processing) telah memenuhi kuorum 42 mahasiswa dan siap membuka 2 kelas.",
                "type": "info",
                "is_read": False,
                "action_url": "course-finder",
            },
            {
                "target_role": "student",
                "title": "Compass AI: Rekomendasi Tersedia",
                "message": "Rencana studi optimal untuk Semester 5 dan 6 telah diperbarui berdasarkan target peminatanmu.",
                "type": "info",
                "is_read": True,
                "action_url": "chatbot",
            },
            # Lecturer notifications
            {
                "target_role": "lecturer",
                "title": "Pengajuan Rencana Studi Mahasiswa",
                "message": "5 mahasiswa bimbingan akademik mengajukan draft KRS untuk diverifikasi dan disetujui dosen wali.",
                "type": "warning",
                "is_read": False,
                "action_url": "dashboard",
            },
            {
                "target_role": "lecturer",
                "title": "Batas Entri RPS & Presensi Perkuliahan",
                "message": "Entri presensi dan silabus/RPS semester aktif wajib dilengkapi sebelum perkuliahan Week 5.",
                "type": "deadline",
                "is_read": False,
                "action_url": "dashboard",
            },
            {
                "target_role": "lecturer",
                "title": "Update Kuorum MK Pilihan Anda",
                "message": "Mata kuliah TSD302 (Pembelajaran Mesin Lanjut) mencapai kuorum 42 peminat (siap buka 2 kelas paralel).",
                "type": "info",
                "is_read": False,
                "action_url": "course-finder",
            },
            {
                "target_role": "lecturer",
                "title": "Jadwal Mengajar Terkonfirmasi",
                "message": "Alokasi ruang kuliah TSD201 Kelas A telah ditetapkan di Ruang Kuliah Bersama 3.02.",
                "type": "info",
                "is_read": True,
                "action_url": "dashboard",
            },
            # Admin notifications
            {
                "target_role": "admin",
                "title": "Monitoring Polling Pra-KRS",
                "message": "Periode pemilihan MK Pilihan Semester Genap 2024/2025 aktif: 45 mahasiswa telah submit preferensi peminatan.",
                "type": "info",
                "is_read": False,
                "action_url": "dashboard",
            },
            {
                "target_role": "admin",
                "title": "Mata Kuliah di Bawah Kuorum",
                "message": "Mata kuliah TI301 (8 peminat) belum memenuhi batas minimum kuorum 15 mahasiswa.",
                "type": "warning",
                "is_read": False,
                "action_url": "course-finder",
            },
            {
                "target_role": "admin",
                "title": "Audit Integritas Kurikulum",
                "message": "Sinkronisasi otomatis katalog 5 prodi dengan SSOT lokal berhasil (195 matkul terverifikasi).",
                "type": "info",
                "is_read": True,
                "action_url": "course-finder",
            },
            {
                "target_role": "admin",
                "title": "Verifikasi Akun Pengajar Baru",
                "message": "2 akun dosen baru terdaftar dari Cybercampus dan memerlukan verifikasi penugasan unit prodi.",
                "type": "deadline",
                "is_read": True,
                "action_url": "dashboard",
            },
        ]

        for ncfg in notifications_seed_data:
            stmt_n = select(UserNotification).where(
                UserNotification.target_role == ncfg["target_role"],
                UserNotification.title == ncfg["title"],
            )
            n_exists = (await session.execute(stmt_n)).scalars().first()
            if not n_exists:
                new_notif = UserNotification(
                    target_role=ncfg["target_role"],
                    title=ncfg["title"],
                    message=ncfg["message"],
                    type=ncfg["type"],
                    is_read=ncfg["is_read"],
                    action_url=ncfg["action_url"],
                )
                session.add(new_notif)

        await session.commit()
        print(f"  [OK] Seeded {len(notifications_seed_data)} persistent user notifications across all roles")
        print("\n[DONE] All seed data successfully populated and verified.")


if __name__ == "__main__":
    asyncio.run(seed_data())
