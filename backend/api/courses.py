"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
import logging
import httpx
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from schemas import (
    CourseModel,
    AdminCourseCreateRequest,
    AdminCourseUpdateRequest,
    CourseSearchResponse,
    CourseSearchItem,
)
from database import get_db
from models import (
    User,
    Course,
    CurriculumCourse,
)
from auth import get_current_user
from catalog import (
    authoritative_curriculum_id,
    catalog_source,
    get_courses_for_program,
    get_all_courses,
    get_available_programs,
    get_course,
    normalize_prodi,
    refresh_from_db,
)

import settings

router = APIRouter()


async def handle_list_courses(
    prodi: str | None = None,
    program_studi: str | None = None,
    semester: int | None = None,
    q: str | None = None,
    page: int | None = None,
    per_page: int | None = None,
) -> Any:
    target_prodi = prodi or program_studi
    norm_prodi = normalize_prodi(target_prodi) if target_prodi else None

    # 1. Forward to Chatbot SSOT microservice if reachable
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params: dict[str, Any] = {}
            if norm_prodi:
                params["program_studi"] = norm_prodi
            if semester is not None:
                params["semester"] = semester
            if q:
                params["q"] = q
            if page is not None:
                params["page"] = page
            if per_page is not None:
                params["per_page"] = per_page

            resp = await client.get(f"{settings.CHATBOT_SERVICE_URL}/api/courses", params=params)
            if resp.status_code == 200:
                data = resp.json()
                raw_programs = [
                    p.replace("S1 ", "").strip() if isinstance(p, str) else p
                    for p in data.get("programs", [])
                ]
                clean_prodi = (
                    data.get("program_studi", "").replace("S1 ", "").strip()
                    if data.get("program_studi")
                    else norm_prodi
                )
                raw_courses = data.get("courses", [])
                for c in raw_courses:
                    if isinstance(c, dict) and "program" in c and isinstance(c["program"], str):
                        c["program"] = c["program"].replace("S1 ", "").strip()

                # If paginated shape
                if "meta" in data and "data" in data:
                    raw_paged = data.get("data", [])
                    for c in raw_paged:
                        if isinstance(c, dict) and "program" in c and isinstance(c["program"], str):
                            c["program"] = c["program"].replace("S1 ", "").strip()
                    return {
                        "source": "chatbot_ssot",
                        "data": raw_paged,
                        "meta": data.get("meta"),
                        "links": data.get("links"),
                        "program_studi": clean_prodi or norm_prodi,
                    }
                return {
                    "source": "chatbot_ssot",
                    "program_studi": clean_prodi or norm_prodi or "Semua Program Studi",
                    "total_courses": data.get("total_courses", len(raw_courses)),
                    "programs": raw_programs,
                    "courses": raw_courses,
                }
    except Exception as exc:
        logger.debug("%s", exc)

    # 2. Resilient fallback to local dataset
    if not norm_prodi or norm_prodi.lower() in ("all", "semua"):
        courses = get_all_courses()
        active_prodi = "Semua Program Studi"
    else:
        active_prodi = norm_prodi
        courses = get_courses_for_program(active_prodi)

    if semester is not None:
        courses = [c for c in courses if c.semester == semester]

    if q and q.strip():
        q_clean = q.strip().lower()
        courses = [
            c for c in courses
            if q_clean in c.name.lower() or q_clean in (c.code or "").lower() or q_clean in c.desc.lower()
        ]

    # Adaptive pagination fallback
    if page is not None or per_page is not None:
        p = max(page or 1, 1)
        pp = max(per_page or 20, 1)
        total = len(courses)
        total_pages = (total + pp - 1) // pp if total > 0 else 0
        sliced = courses[(p - 1) * pp : p * pp]

        prefix = f"/api/v1/courses?per_page={pp}"
        if norm_prodi:
            prefix += f"&prodi={norm_prodi}"
        if semester:
            prefix += f"&semester={semester}"
        if q:
            prefix += f"&q={q}"

        return {
            "source": f"catalog_{catalog_source()}",
            "data": [c.model_dump() for c in sliced],
            "meta": {
                "total": total,
                "page": p,
                "per_page": pp,
                "total_pages": total_pages,
            },
            "links": {
                "self": f"{prefix}&page={p}",
                "next": f"{prefix}&page={p + 1}" if p < total_pages else None,
                "prev": f"{prefix}&page={p - 1}" if p > 1 else None,
                "first": f"{prefix}&page=1",
                "last": f"{prefix}&page={total_pages}" if total_pages > 0 else None,
            },
            "program_studi": active_prodi,
        }

    return {
        "source": f"catalog_{catalog_source()}",
        "program_studi": active_prodi,
        "total_courses": len(courses),
        "programs": get_available_programs(),
        "courses": [c.model_dump() for c in courses],
    }


async def handle_search_courses(
    q: str,
    prodi: str | None = None,
    program_studi: str | None = None,
    top_k: int = 5,
) -> CourseSearchResponse:
    target_prodi = prodi or program_studi
    norm_prodi = normalize_prodi(target_prodi) if target_prodi else None

    # Try microservice
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {"q": q, "top_k": top_k}
            if norm_prodi:
                params["prodi"] = norm_prodi
            resp = await client.get(f"{settings.CHATBOT_SERVICE_URL}/api/courses/search", params=params)
            if resp.status_code == 200:
                data = resp.json()
                return CourseSearchResponse(
                    source="chatbot_ssot",
                    query=data.get("query", q),
                    program_studi=data.get("program_studi") or norm_prodi,
                    total_hits=data.get("total_hits", len(data.get("results", []))),
                    results=[CourseSearchItem(**item) for item in data.get("results", [])],
                )
    except Exception as exc:
        logger.debug("%s", exc)

    # Local fallback
    if norm_prodi and norm_prodi.lower() not in ("all", "semua"):
        courses = get_courses_for_program(norm_prodi)
    else:
        courses = get_all_courses()
    q_lower = q.lower().strip()
    hits: list[CourseSearchItem] = []
    for c in courses:
        score = 0.0
        if q_lower == (c.code or "").lower():
            score = 1.0
        elif q_lower in c.name.lower():
            score = 0.8
        elif q_lower in c.desc.lower():
            score = 0.5
        if score > 0.0:
            hits.append(
                CourseSearchItem(
                    **c.model_dump(),
                    score=score,
                )
            )

    hits.sort(key=lambda x: x.score, reverse=True)
    selected = hits[:top_k]
    return CourseSearchResponse(
        source=f"catalog_{catalog_source()}",
        query=q,
        program_studi=norm_prodi,
        total_hits=len(selected),
        results=selected,
    )


logger = logging.getLogger("ftmm_compass.gateway")




@router.get("/courses")
async def v1_list_courses(
    program_studi: str | None = Query(None, description="Nama program studi FTMM."),
    prodi: str | None = Query(None, description="Alias nama prodi."),
    semester: int | None = Query(None, description="Filter semester (1-8)."),
    q: str | None = Query(None, description="Pencarian semantik silabus atau nama mata kuliah."),
    page: int | None = Query(None, ge=1, description="Nomor halaman (1-based)."),
    per_page: int | None = Query(None, ge=1, le=100, description="Jumlah item per halaman."),
):
    return await handle_list_courses(
        prodi=prodi,
        program_studi=program_studi,
        semester=semester,
        q=q,
        page=page,
        per_page=per_page,
    )


@router.get("/courses/search", response_model=CourseSearchResponse)
async def v1_search_courses(
    q: str = Query(..., min_length=1, description="Kata kunci, kode, atau nama mata kuliah."),
    prodi: str | None = Query(None, description="Filter nama prodi."),
    program_studi: str | None = Query(None, description="Alias prodi."),
    top_k: int = Query(5, ge=1, le=20, description="Batas hasil pencarian."),
):
    return await handle_search_courses(
        q=q,
        prodi=prodi,
        program_studi=program_studi,
        top_k=top_k,
    )

@router.post("/admin/courses", response_model=CourseModel, status_code=status.HTTP_201_CREATED)
async def v1_admin_create_course(
    payload: AdminCourseCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya role admin yang dapat menambahkan mata kuliah.",
        )

    stmt = select(Course).where(Course.course_code == payload.course_code)
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mata kuliah dengan kode '{payload.course_code}' sudah terdaftar.",
        )

    new_course = Course(
        course_code=payload.course_code,
        course_name=payload.course_name,
        is_active=True,
    )
    db.add(new_course)
    await db.flush()

    norm_prodi = normalize_prodi(payload.program_name) or "Teknologi Sains Data"
    curriculum_id = await authoritative_curriculum_id(db, norm_prodi)
    if curriculum_id:
        curr_course = CurriculumCourse(
            curriculum_id=curriculum_id,
            course_id=new_course.course_id,
            credits_total=payload.credits,
            recommended_semester=payload.recommended_semester,
            term=payload.term,
            course_type=payload.course_type.lower(),
            course_scope="program_studi",
            description=payload.description or "",
            is_active=True,
        )
        db.add(curr_course)

    await db.commit()

    await refresh_from_db(db)
    created = get_course(payload.course_code)
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mata kuliah tersimpan tetapi gagal dibaca dari katalog.",
        )
    return created


@router.put("/admin/courses/{course_id}", response_model=CourseModel)
async def v1_admin_update_course(
    course_id: str,
    payload: AdminCourseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya role admin yang dapat mengubah mata kuliah.",
        )

    stmt = select(Course).where(or_(Course.course_code == course_id, cast(Course.course_id, String) == course_id))
    course_db = (await db.execute(stmt)).scalars().first()
    if course_db:
        if payload.course_code and payload.course_code != course_db.course_code:
            stmt_dup = select(Course).where(Course.course_code == payload.course_code)
            if (await db.execute(stmt_dup)).scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Kode mata kuliah '{payload.course_code}' sudah terdaftar.",
                )
            course_db.course_code = payload.course_code
        if payload.course_name:
            course_db.course_name = payload.course_name
        if payload.is_active is not None:
            course_db.is_active = payload.is_active

        stmt_cc = select(CurriculumCourse).where(CurriculumCourse.course_id == course_db.course_id)
        cc = (await db.execute(stmt_cc)).scalars().first()
        if cc:
            if payload.program_name:
                curriculum_id = await authoritative_curriculum_id(
                    db, payload.program_name
                )
                if curriculum_id:
                    cc.curriculum_id = curriculum_id
            if payload.credits is not None:
                cc.credits_total = payload.credits
            if payload.recommended_semester is not None:
                cc.recommended_semester = payload.recommended_semester
            if payload.term is not None:
                cc.term = payload.term
            if payload.course_type is not None:
                cc.course_type = payload.course_type.lower()
            if payload.description is not None:
                cc.description = payload.description
            if payload.is_active is not None:
                cc.is_active = payload.is_active
        await db.commit()

    updates = {}
    if payload.course_code is not None:
        updates["code"] = payload.course_code
        updates["id"] = payload.course_code
    if payload.course_name is not None:
        updates["name"] = payload.course_name
    if payload.program_name is not None:
        updates["program"] = normalize_prodi(payload.program_name) or payload.program_name
    if payload.credits is not None:
        updates["credits"] = payload.credits
    if payload.recommended_semester is not None:
        updates["semester"] = payload.recommended_semester
    if payload.term is not None:
        updates["parity"] = "odd" if payload.term == "ganjil" else "even"
    if payload.course_type is not None:
        updates["type"] = payload.course_type
    if payload.description is not None:
        updates["desc"] = payload.description
    if payload.lecturer is not None:
        updates["lecturer"] = payload.lecturer
    if payload.prerequisites is not None:
        updates["prerequisites"] = payload.prerequisites
    await refresh_from_db(db)
    target_code = payload.course_code or (course_db.course_code if course_db else course_id)
    updated = get_course(target_code)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mata kuliah dengan ID/kode '{course_id}' tidak ditemukan.",
        )
    return updated


@router.delete("/admin/courses/{course_id}")
async def v1_admin_delete_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya role admin yang dapat menonaktifkan mata kuliah.",
        )

    stmt = select(Course).where(or_(Course.course_code == course_id, cast(Course.course_id, String) == course_id))
    course_db = (await db.execute(stmt)).scalars().first()
    if course_db:
        course_db.is_active = False
        await db.commit()

    await refresh_from_db(db)
    return {"status": "success", "message": f"Mata kuliah {course_id} berhasil dinonaktifkan."}


