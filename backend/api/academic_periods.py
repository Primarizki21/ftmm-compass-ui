"""Periode akademik berjalan, satu-satunya sumber untuk frontend."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from academics import current_period, period_payload
from auth import get_current_user
from database import get_db
from models import AcademicPeriod, User
from schemas import AcademicPeriodResponse

router = APIRouter()


@router.get("/academic-periods/current", response_model=AcademicPeriodResponse)
async def get_current_academic_period(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = (
        await db.execute(
            select(AcademicPeriod).where(AcademicPeriod.is_active.is_(True))
        )
    ).scalars().first()
    today = date.today()

    if period is None:
        year_start, term = current_period(today)
        return AcademicPeriodResponse(
            **period_payload(year_start, term, None, None, today)
        )

    return AcademicPeriodResponse(
        **period_payload(
            period.academic_year_start,
            period.term,
            period.start_date,
            period.end_date,
            today,
        )
    )
