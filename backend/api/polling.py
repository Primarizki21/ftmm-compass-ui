"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
from typing import Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession
from schemas import (
    PollingPeriodResponse,
    CreatePollingPeriodRequest,
    ElectiveVoteRequest,
    ElectiveVoteResponse,
    CourseDemandItem,
    DemandAnalyticsResponse,
)
from api.errors import error_response
from database import get_db
from models import (
    User,
    ElectivePollingPeriod,
    ElectiveCourseVote,
    StudentProfile,
    StudyProgram,
    Course,
    CurriculumCourse,
)
from auth import get_current_user
from catalog import (
    PRODI_ALIASES,
    get_all_courses,
    get_course,
    normalize_prodi,
    prodi_code,
)
from academics import parity_of
from prodi_access import require_pj_scope

logger = logging.getLogger("ftmm_compass.polling")


def _reject(status_code: int, code: str, message: str) -> JSONResponse:
    return error_response(status_code, code, message, detail=message)


async def _shared_course_codes(db: AsyncSession) -> set[str]:
    """Kode MK yang berlaku lintas prodi (scope fakultas/universitas)."""
    rows = (
        await db.execute(
            select(Course.course_code)
            .join(CurriculumCourse, CurriculumCourse.course_id == Course.course_id)
            .where(CurriculumCourse.course_scope.in_(("fakultas", "universitas")))
        )
    ).scalars().all()
    return {code for code in rows if code}


def _has_shared_scope(course, shared_codes: set[str]) -> bool:
    scope = getattr(course, "course_scope", None)
    return scope in ("fakultas", "universitas") or (course.code or course.id) in shared_codes


router = APIRouter()


def _to_polling_period_response(period: ElectivePollingPeriod) -> PollingPeriodResponse:
    term_val = period.target_term if period.target_term in ("ganjil", "genap") else "ganjil"
    return PollingPeriodResponse(
        period_id=str(period.polling_period_id),
        academic_year=period.academic_year,
        term=term_val,
        target_semester_type=term_val,
        start_date=period.start_date.isoformat(),
        end_date=period.end_date.isoformat(),
        is_active=(period.status == "open"),
        min_quorum=period.min_quota_threshold,
        max_votes_per_student=period.max_votes_per_student,
        description=period.description or period.title,
    )


@router.get("/polling/periods/active", response_model=PollingPeriodResponse)
async def get_active_polling_period(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    result = await db.execute(stmt)
    period = result.scalars().first()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tidak ada periode polling pra-KRS yang sedang aktif.",
        )
    return _to_polling_period_response(period)


@router.post("/admin/polling/periods", response_model=PollingPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_polling_period(
    payload: CreatePollingPeriodRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya role admin yang dapat membuat periode polling.",
        )

    try:
        from datetime import datetime
        start_dt = datetime.fromisoformat(payload.start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(payload.end_date.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format tanggal tidak valid: {exc}",
        )

    period = ElectivePollingPeriod(
        title=payload.title,
        academic_year=payload.academic_year,
        target_term=payload.target_term,
        target_semester=payload.target_semester,
        start_date=start_dt,
        end_date=end_dt,
        status=payload.status,
        min_quota_threshold=payload.min_quota_threshold,
        max_votes_per_student=payload.max_votes_per_student,
        description=payload.description or payload.title,
    )
    db.add(period)
    await db.flush()
    await db.refresh(period)
    return _to_polling_period_response(period)


@router.get("/polling/my-votes", response_model=list[ElectiveVoteResponse])
async def get_my_votes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya mahasiswa yang memiliki daftar vote pilihan.",
        )

    stmt_period = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    res_period = await db.execute(stmt_period)
    active_period = res_period.scalars().first()

    stmt = select(ElectiveCourseVote).where(ElectiveCourseVote.user_id == current_user.user_id)
    if active_period:
        stmt = stmt.where(ElectiveCourseVote.polling_period_id == active_period.polling_period_id)
    stmt = stmt.order_by(ElectiveCourseVote.priority.asc(), ElectiveCourseVote.created_at.asc())

    result = await db.execute(stmt)
    votes = result.scalars().all()

    return [
        ElectiveVoteResponse(
            vote_id=str(v.vote_id),
            course_id=v.course_id,
            course_code=v.course_code,
            course_name=v.course_name,
            priority=v.priority,
            created_at=v.created_at.isoformat(),
        )
        for v in votes
    ]


@router.post("/polling/votes", response_model=ElectiveVoteResponse)
async def submit_vote(
    payload: ElectiveVoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        return _reject(
            status.HTTP_403_FORBIDDEN,
            "forbidden",
            "Hanya mahasiswa yang dapat melakukan voting peminatan.",
        )

    stmt_period = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    active_period = (await db.execute(stmt_period)).scalars().first()
    if not active_period:
        return _reject(
            status.HTTP_400_BAD_REQUEST,
            "no_active_period",
            "Tidak ada periode polling pra-KRS yang sedang aktif.",
        )

    student_profile = current_user.student_profile
    if not student_profile:
        return _reject(
            status.HTTP_400_BAD_REQUEST,
            "student_profile_missing",
            "Profil akademik mahasiswa belum terdaftar.",
        )

    current_sem = student_profile.current_semester
    next_sem = current_sem + 1
    next_parity = "ganjil" if next_sem % 2 == 1 else "genap"
    if next_parity != active_period.target_term:
        return _reject(
            status.HTTP_400_BAD_REQUEST,
            "parity_mismatch",
            f"Periode polling {active_period.target_term} untuk semester berikutnya. "
            f"Semester {current_sem} berlanjut ke semester {next_sem} ({next_parity}).",
        )

    needle = payload.course_id.strip().lower()
    matched_course = next(
        (
            course
            for course in get_all_courses()
            if course.id.lower() == needle or (course.code or "").lower() == needle
        ),
        None,
    )
    if matched_course is None:
        return _reject(
            422,
            "unknown_course",
            "Kode mata kuliah tidak ditemukan di katalog.",
        )
    if matched_course.type != "Pilihan":
        return _reject(
            422,
            "course_not_elective",
            "Hanya mata kuliah Pilihan yang dapat divote.",
        )

    course_code = matched_course.code or matched_course.id
    shared_codes = await _shared_course_codes(db)
    if not _has_shared_scope(matched_course, shared_codes):
        student_program = student_profile.study_program
        own_name = normalize_prodi(student_program.program_name) if student_program else None
        own_code = student_program.program_code if student_program else None
        if not own_name and not own_code:
            return _reject(
                status.HTTP_403_FORBIDDEN,
                "prodi_belum_ditetapkan",
                "Prodi mahasiswa belum ditetapkan.",
            )
        course_name = normalize_prodi(matched_course.program)
        course_prodi_code = prodi_code(matched_course.program)
        same_program = (course_name is not None and course_name == own_name) or bool(
            course_prodi_code and course_prodi_code == own_code
        )
        if not same_program:
            return _reject(
                422,
                "course_wrong_program",
                "Mata kuliah pilihan ini tidak termasuk program studi mahasiswa.",
            )

    if getattr(matched_course, "is_active", True) is False:
        return _reject(409, "course_inactive", "Mata kuliah ini sedang dinonaktifkan.")
    active_rows = (
        await db.execute(
            select(CurriculumCourse.is_active, Course.is_active)
            .join(Course, Course.course_id == CurriculumCourse.course_id)
            .where(Course.course_code == course_code)
        )
    ).all()
    if active_rows and not any(cc_active and c_active for cc_active, c_active in active_rows):
        return _reject(409, "course_inactive", "Mata kuliah ini sedang dinonaktifkan.")

    period_parity = "odd" if active_period.target_term == "ganjil" else "even"
    if active_period.target_term not in ("ganjil", "genap") and active_period.target_semester:
        period_parity = parity_of(int(active_period.target_semester))
    if matched_course.parity != period_parity:
        course_term = "ganjil" if matched_course.parity == "odd" else "genap"
        period_term = "ganjil" if period_parity == "odd" else "genap"
        return _reject(
            status.HTTP_400_BAD_REQUEST,
            "parity_mismatch",
            f"Mata kuliah {course_code} ditawarkan pada semester {course_term} dan tidak dapat divote "
            f"pada periode polling semester {period_term}.",
        )

    stmt_existing = select(ElectiveCourseVote).where(
        ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
        ElectiveCourseVote.user_id == current_user.user_id,
        or_(
            ElectiveCourseVote.course_id == matched_course.id,
            ElectiveCourseVote.course_id == course_code,
            ElectiveCourseVote.course_code == course_code,
        ),
    )
    existing_vote = (await db.execute(stmt_existing)).scalars().first()

    stmt_duplicate = select(func.count(ElectiveCourseVote.vote_id)).where(
        ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
        ElectiveCourseVote.user_id == current_user.user_id,
        ElectiveCourseVote.priority == payload.priority,
    )
    if existing_vote is not None:
        stmt_duplicate = stmt_duplicate.where(
            ElectiveCourseVote.vote_id != existing_vote.vote_id
        )
    duplicate_count = (await db.execute(stmt_duplicate)).scalar() or 0
    if duplicate_count:
        return _reject(
            422,
            "duplicate_priority",
            "Prioritas ini sudah dipakai untuk vote lain pada periode aktif.",
        )

    if existing_vote is not None:
        existing_vote.priority = payload.priority
        await db.flush()
        await db.refresh(existing_vote)
        return ElectiveVoteResponse(
            vote_id=str(existing_vote.vote_id),
            course_id=existing_vote.course_id,
            course_code=existing_vote.course_code,
            course_name=existing_vote.course_name,
            priority=existing_vote.priority,
            created_at=existing_vote.created_at.isoformat(),
        )

    stmt_count = select(func.count(ElectiveCourseVote.vote_id)).where(
        ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
        ElectiveCourseVote.user_id == current_user.user_id,
    )
    current_vote_count = (await db.execute(stmt_count)).scalar() or 0
    if current_vote_count >= active_period.max_votes_per_student:
        return _reject(
            status.HTTP_409_CONFLICT,
            "quota_reached",
            f"Batas kuota vote telah tercapai ({active_period.max_votes_per_student} mata kuliah).",
        )

    new_vote = ElectiveCourseVote(
        polling_period_id=active_period.polling_period_id,
        user_id=current_user.user_id,
        course_id=matched_course.id,
        course_code=course_code,
        course_name=matched_course.name,
        credits=matched_course.credits,
        priority=payload.priority,
    )
    db.add(new_vote)
    await db.flush()
    await db.refresh(new_vote)

    return ElectiveVoteResponse(
        vote_id=str(new_vote.vote_id),
        course_id=new_vote.course_id,
        course_code=new_vote.course_code,
        course_name=new_vote.course_name,
        priority=new_vote.priority,
        created_at=new_vote.created_at.isoformat(),
    )


@router.delete("/polling/votes/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vote(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        return _reject(
            status.HTTP_403_FORBIDDEN,
            "forbidden",
            "Hanya mahasiswa yang dapat membatalkan vote.",
        )

    period_stmt = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    active_period = (await db.execute(period_stmt)).scalars().first()
    if not active_period:
        return None

    catalog_course = get_course(course_id)
    identifiers = {course_id}
    if catalog_course is not None:
        identifiers.update((catalog_course.id, catalog_course.code or ""))
    stmt = select(ElectiveCourseVote).where(
        ElectiveCourseVote.user_id == current_user.user_id,
        ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
        or_(
            ElectiveCourseVote.course_id.in_(identifiers),
            ElectiveCourseVote.course_code.in_(identifiers),
        ),
    )
    result = await db.execute(stmt)
    vote = result.scalars().first()
    if vote:
        await db.delete(vote)
        await db.flush()
    return None

async def _fetch_demand_analytics(
    study_program: Optional[str],
    db: AsyncSession,
) -> DemandAnalyticsResponse:
    stmt_period = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    res_period = await db.execute(stmt_period)
    active_period = res_period.scalars().first()

    if not active_period:
        stmt_last = select(ElectivePollingPeriod).order_by(ElectivePollingPeriod.created_at.desc())
        res_last = await db.execute(stmt_last)
        active_period = res_last.scalars().first()

    if not active_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belum ada periode polling yang terdaftar di sistem.",
        )

    filter_name = normalize_prodi(study_program) if study_program else None
    if filter_name and filter_name.lower() == "all":
        filter_name = None
    filter_code = prodi_code(filter_name) if filter_name else ""
    shared_codes = await _shared_course_codes(db) if filter_name else set()

    if filter_name:
        name_variants = {
            alias.lower()
            for alias, formal in PRODI_ALIASES.items()
            if formal == filter_name
        }
        name_variants.add(filter_name.lower())
        stmt_total_mhs = (
            select(func.count(func.distinct(ElectiveCourseVote.user_id)))
            .join(User, User.user_id == ElectiveCourseVote.user_id)
            .join(StudentProfile, StudentProfile.user_id == User.user_id)
            .join(StudyProgram, StudyProgram.study_program_id == StudentProfile.study_program_id)
            .where(
                ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
                or_(
                    StudyProgram.program_code == filter_code,
                    func.lower(StudyProgram.program_name).in_(name_variants),
                ),
            )
        )
    else:
        stmt_total_mhs = (
            select(func.count(func.distinct(ElectiveCourseVote.user_id)))
            .where(ElectiveCourseVote.polling_period_id == active_period.polling_period_id)
        )
    total_students_voted = (await db.execute(stmt_total_mhs)).scalar() or 0

    stmt_votes = (
        select(
            ElectiveCourseVote.course_id,
            ElectiveCourseVote.course_code,
            ElectiveCourseVote.course_name,
            ElectiveCourseVote.credits,
            func.count(ElectiveCourseVote.vote_id).label("total_votes"),
            func.count(case((ElectiveCourseVote.priority == 1, 1))).label("priority_1_votes"),
            func.count(case((ElectiveCourseVote.priority == 2, 1))).label("priority_2_votes"),
            func.count(case((ElectiveCourseVote.priority == 3, 1))).label("priority_3_votes"),
        )
        .where(ElectiveCourseVote.polling_period_id == active_period.polling_period_id)
        .group_by(
            ElectiveCourseVote.course_id,
            ElectiveCourseVote.course_code,
            ElectiveCourseVote.course_name,
            ElectiveCourseVote.credits,
        )
    )
    vote_rows = (await db.execute(stmt_votes)).all()

    all_courses = get_all_courses()
    course_lookup = {c.id: c for c in all_courses}
    course_code_lookup = {c.code: c for c in all_courses}

    items: list[CourseDemandItem] = []
    min_q = active_period.min_quota_threshold

    for row in vote_rows:
        cid = row.course_id
        c_obj = course_lookup.get(cid) or course_code_lookup.get(row.course_code)
        if c_obj is None:
            logger.warning(
                "Vote %s (%s) tidak ditemukan di katalog; dilewati",
                cid,
                row.course_code,
            )
            continue

        prog_name = c_obj.program or ""
        prog_code = prodi_code(prog_name)
        tot = row.total_votes
        p1 = row.priority_1_votes
        p2 = row.priority_2_votes
        p3 = row.priority_3_votes

        if tot >= min_q:
            c_status = "QUALIFIED"
        elif tot >= 10:
            c_status = "BORDERLINE"
        else:
            c_status = "UNQUALIFIED"

        proj_classes = (tot // 40) + 1 if tot > 0 else 0

        if filter_name:
            same_prodi = normalize_prodi(prog_name) == filter_name or (
                filter_code != "" and prog_code == filter_code
            )
            if not same_prodi and not _has_shared_scope(c_obj, shared_codes):
                continue

        items.append(
            CourseDemandItem(
                course_id=c_obj.id,
                course_code=row.course_code,
                course_name=row.course_name,
                study_program=prog_name,
                program_code=prog_code or None,
                credits=row.credits,
                total_votes=tot,
                priority_1_votes=p1,
                priority_2_votes=p2,
                priority_3_votes=p3,
                min_quorum=min_q,
                status=c_status,
                projected_classes=proj_classes,
            )
        )

    items.sort(key=lambda it: (it.total_votes, it.priority_1_votes), reverse=True)

    return DemandAnalyticsResponse(
        period=_to_polling_period_response(active_period),
        total_students_voted=total_students_voted,
        items=items,
    )


@router.get("/polling/demand-analytics", response_model=DemandAnalyticsResponse)
async def get_student_demand_analytics(
    study_program: Optional[str] = Query(None, description="Filter program studi"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        return _reject(
            status.HTTP_403_FORBIDDEN,
            "forbidden",
            "Rekap peminatan mahasiswa hanya tersedia untuk mahasiswa.",
        )
    return await _fetch_demand_analytics(None, db)


@router.get("/admin/polling/demand-analytics", response_model=DemandAnalyticsResponse)
async def get_demand_analytics(
    study_program: Optional[str] = Query(None, description="Filter program studi"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scoped_prodi = require_pj_scope(current_user, db, study_program)
    if isinstance(scoped_prodi, JSONResponse):
        return scoped_prodi
    return await _fetch_demand_analytics(scoped_prodi, db)


