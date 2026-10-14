import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import AsyncSessionLocal, engine
from models import StudyProgram, User, StudentProfile
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


async def seed_data():
    async with AsyncSessionLocal() as session:
        print("🌱 Checking and seeding Study Programs...")
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
                print(f"  + Added study program: {prodi.program_code} - {prodi.program_name}")
            else:
                print(f"  = Existing study program: {prodi.program_code}")
            prodi_map[prodi.program_code] = prodi

        print("\n🌱 Checking and seeding Test Users...")

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
            print(f"  + Created Admin user: {admin_email}")
        else:
            admin_user.password_hash = get_password_hash("AdminFTMM2026!")
            print(f"  = Existing Admin user: {admin_email} (password verified)")

        # 2. Mahasiswa
        mhs_email = "mahasiswa.testing@ftmm.unair.ac.id"
        stmt = (
            select(User)
            .options(selectinload(User.student_profile))
            .where(User.email == mhs_email)
        )
        mhs_user = (await session.execute(stmt)).scalars().first()
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

            tsd_prodi = prodi_map.get("TSD")
            profile = StudentProfile(
                user_id=mhs_user.user_id,
                study_program_id=tsd_prodi.study_program_id,
                student_number="164231001",
                admission_year=2023,
                current_semester=3,
            )
            session.add(profile)
            print(f"  + Created Mahasiswa user: {mhs_email} with NIM 164231001")
        else:
            mhs_user.password_hash = get_password_hash("Mahasiswa2026!")
            if not mhs_user.student_profile:
                tsd_prodi = prodi_map.get("TSD")
                profile = StudentProfile(
                    user_id=mhs_user.user_id,
                    study_program_id=tsd_prodi.study_program_id,
                    student_number="164231001",
                    admission_year=2023,
                    current_semester=3,
                )
                session.add(profile)
            print(f"  = Existing Mahasiswa user: {mhs_email} (password verified)")

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
            print(f"  + Created Dosen user: {dosen_email}")
        else:
            dosen_user.password_hash = get_password_hash("DosenFTMM2026!")
            print(f"  = Existing Dosen user: {dosen_email} (password verified)")

        await session.commit()
        print("\n✅ Seeding finished successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
