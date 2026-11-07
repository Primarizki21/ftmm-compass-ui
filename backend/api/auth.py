"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_, update, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from schemas import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    UserProfileUpdateRequest,
    UserStudentProfileResponse,
    NotificationItemResponse,
    NotificationListResponse,
)
from database import get_db
from models import (
    User,
    StudentProfile as StudentProfileModel,
    UserNotification,
)
from auth import authenticate_user, create_access_token, get_current_user


router = APIRouter()


def _build_user_response(user: User) -> UserResponse:
    student_profile_data = None
    if user.student_profile:
        sp = user.student_profile
        student_profile_data = UserStudentProfileResponse(
            student_number=sp.student_number,
            study_program=sp.study_program.program_name if sp.study_program else None,
            program_code=sp.study_program.program_code if sp.study_program else None,
            admission_year=sp.admission_year,
            current_semester=sp.current_semester,
        )

    if user.role == "student":
        academic_id = user.student_profile.student_number if user.student_profile else "164231001"
        unit_name = (
            user.student_profile.study_program.program_name
            if (user.student_profile and user.student_profile.study_program)
            else "Teknologi Sains Data"
        )
        permissions = ["view_catalog", "plan_courses", "vote_electives", "use_chatbot"]
        default_phone = "081234567890"
        default_bio = "Mahasiswa FTMM peminat Data Science dan Machine Learning"
        default_interests = ["Machine Learning", "Data Science"]
    elif user.role == "lecturer":
        academic_id = "198803152015041002"
        unit_name = "Teknologi Sains Data"
        permissions = ["view_catalog", "view_demand_analytics", "review_study_plans", "use_chatbot"]
        default_phone = "081398765432"
        default_bio = "Dosen Pengajar dan Pembina Akademik FTMM UNAIR"
        default_interests = []
    else:
        academic_id = "198504122010121003"
        unit_name = "Sub-Bagian Akademik & Kemahasiswaan FTMM"
        permissions = [
            "view_catalog",
            "view_demand_analytics",
            "manage_polling",
            "export_reports",
            "inspect_curricula",
            "use_chatbot",
        ]
        default_phone = "081122334455"
        default_bio = "Pengelola Master Kurikulum dan Operasional Akademik FTMM"
        default_interests = []

    return UserResponse(
        user_id=str(user.user_id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        auth_provider="Cybercampus SSO UNAIR",
        academic_identifier=academic_id,
        unit_name=unit_name,
        phone_number=user.phone_number or default_phone,
        bio=user.bio or default_bio,
        career_interests=user.career_interests or default_interests,
        permissions=permissions,
        student_profile=student_profile_data,
    )


@router.post("/auth/login", response_model=LoginResponse)
async def v1_login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.identifier, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="NIM/Email atau kata sandi tidak valid",
        )

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role})

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,
        user=_build_user_response(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def v1_me(current_user: User = Depends(get_current_user)):
    return _build_user_response(current_user)


@router.patch("/auth/me/profile", response_model=UserResponse)
async def v1_update_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.phone_number is not None:
        current_user.phone_number = payload.phone_number.strip()
    if payload.bio is not None:
        current_user.bio = payload.bio.strip()
    if payload.career_interests is not None:
        current_user.career_interests = [
            ci.strip() for ci in payload.career_interests if ci and ci.strip()
        ]

    await db.commit()
    # Re-fetch with student_profile relationship loaded
    stmt = (
        select(User)
        .options(selectinload(User.student_profile).selectinload(StudentProfileModel.study_program))
        .where(User.user_id == current_user.user_id)
    )
    res = await db.execute(stmt)
    refreshed_user = res.scalars().first() or current_user
    return _build_user_response(refreshed_user)

def _format_relative_time(dt: datetime) -> str:
    now = datetime.now(dt.tzinfo or timezone.utc)
    diff = now - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "Baru saja"
    if secs < 3600:
        return f"{secs // 60} menit lalu"
    if secs < 86400:
        return f"{secs // 3600} jam lalu"
    days = secs // 86400
    if days < 7:
        return f"{days} hari lalu"
    return dt.strftime("%d %b %Y")


@router.get("/notifications/me", response_model=NotificationListResponse)
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(UserNotification)
        .where(
            or_(
                UserNotification.user_id == current_user.user_id,
                UserNotification.target_role == current_user.role,
                and_(UserNotification.user_id == None, UserNotification.target_role == None),
            )
        )
        .order_by(UserNotification.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    unread_count = sum(1 for r in rows if not r.is_read)

    items = [
        NotificationItemResponse(
            id=str(r.notification_id),
            title=r.title,
            message=r.message,
            type=r.type if r.type in ("warning", "deadline", "info", "success") else "info",
            is_read=r.is_read,
            action_url=r.action_url,
            timestamp=_format_relative_time(r.created_at),
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]

    return NotificationListResponse(unread_count=unread_count, items=items)


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(UserNotification).where(
        cast(UserNotification.notification_id, String) == notification_id
    )
    notif = (await db.execute(stmt)).scalars().first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notifikasi tidak ditemukan.",
        )
    notif.is_read = True
    await db.commit()
    return {"status": "success", "message": "Notifikasi ditandai sebagai telah dibaca."}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        update(UserNotification)
        .where(
            or_(
                UserNotification.user_id == current_user.user_id,
                UserNotification.target_role == current_user.role,
            )
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "Semua notifikasi telah ditandai dibaca."}
