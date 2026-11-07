"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from schemas import (
    PollingPeriodResponse,
    CreatePollingPeriodRequest,
    ElectiveVoteRequest,
    ElectiveVoteResponse,
    CourseDemandItem,
    DemandAnalyticsResponse,
)
from database import get_db
from models import (
    User,
    ElectivePollingPeriod,
    ElectiveCourseVote,
)
from auth import get_current_user
from catalog import (
    get_all_courses,
)


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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya mahasiswa yang dapat melakukan voting peminatan.",
        )

    stmt_period = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    res_period = await db.execute(stmt_period)
    active_period = res_period.scalars().first()
    if not active_period:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada periode polling pra-KRS yang sedang aktif.",
        )

    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil akademik mahasiswa belum terdaftar.",
        )

    current_sem = student_profile.current_semester
    student_parity = "ganjil" if (current_sem % 2 == 1) else "genap"
    if student_parity != active_period.target_term:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Paritas semester tidak sesuai. Periode polling untuk semester {active_period.target_term}, sedangkan mahasiswa berada pada semester {student_parity} (semester {current_sem}).",
        )

    all_courses = get_all_courses()
    matched_course = None
    for c in all_courses:
        if c.id == payload.course_id or c.code == payload.course_id:
            matched_course = c
            break

    c_code = matched_course.code if matched_course else payload.course_id
    c_name = matched_course.name if matched_course else payload.course_id
    c_credits = matched_course.credits if matched_course else 3

    stmt_existing = select(ElectiveCourseVote).where(
        ElectiveCourseVote.polling_period_id == active_period.polling_period_id,
        ElectiveCourseVote.user_id == current_user.user_id,
        ElectiveCourseVote.course_id == payload.course_id,
    )
    res_existing = await db.execute(stmt_existing)
    existing_vote = res_existing.scalars().first()

    if existing_vote:
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
    res_count = await db.execute(stmt_count)
    current_vote_count = res_count.scalar() or 0

    if current_vote_count >= active_period.max_votes_per_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Batas kuota vote telah tercapai ({active_period.max_votes_per_student} mata kuliah). Batalkan vote yang ada terlebih dahulu jika ingin mengganti pilihan.",
        )

    new_vote = ElectiveCourseVote(
        polling_period_id=active_period.polling_period_id,
        user_id=current_user.user_id,
        course_id=payload.course_id,
        course_code=c_code,
        course_name=c_name,
        credits=c_credits,
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya mahasiswa yang dapat membatalkan vote.",
        )

    stmt = select(ElectiveCourseVote).where(
        ElectiveCourseVote.user_id == current_user.user_id,
        ElectiveCourseVote.course_id == course_id,
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

    stmt_total_mhs = (
        select(func.count(func.distinct(ElectiveCourseVote.user_id)))
        .where(ElectiveCourseVote.polling_period_id == active_period.polling_period_id)
    )
    res_total_mhs = await db.execute(stmt_total_mhs)
    total_students_voted = res_total_mhs.scalar() or 0

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
    res_votes = await db.execute(stmt_votes)
    vote_rows = res_votes.all()

    all_courses = get_all_courses()
    course_lookup = {c.id: c for c in all_courses}
    course_code_lookup = {c.code: c for c in all_courses}

    items: list[CourseDemandItem] = []
    min_q = active_period.min_quota_threshold

    for row in vote_rows:
        cid = row.course_id
        c_obj = course_lookup.get(cid) or course_code_lookup.get(row.course_code)
        prog_name = c_obj.program if c_obj else "Teknologi Sains Data"

        prog_code = None
        if "Sains Data" in prog_name:
            prog_code = "TSD"
        elif "Robotika" in prog_name:
            prog_code = "TRKB"
        elif "Nanoteknologi" in prog_name:
            prog_code = "RN"
        elif "Industri" in prog_name:
            prog_code = "TI"
        elif "Elektro" in prog_name:
            prog_code = "TE"

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

        if study_program and study_program != "all":
            if prog_name != study_program and prog_code != study_program:
                continue

        items.append(
            CourseDemandItem(
                course_id=cid,
                course_code=row.course_code,
                course_name=row.course_name,
                study_program=prog_name,
                program_code=prog_code,
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
    return await _fetch_demand_analytics(study_program, db)


@router.get("/admin/polling/demand-analytics", response_model=DemandAnalyticsResponse)
async def get_demand_analytics(
    study_program: Optional[str] = Query(None, description="Filter program studi"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    allowed_roles = {"lecturer", "admin", "faculty_staff"}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya dosen, admin, atau staf fakultas yang dapat mengakses rekapitulasi analitik peminatan.",
        )
    return await _fetch_demand_analytics(study_program, db)


