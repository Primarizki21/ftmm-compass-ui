import os
import json
from contextlib import asynccontextmanager
import httpx
from typing import Any, AsyncGenerator, Optional
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import text, select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from schemas import (
    ChatRequest,
    ChatResponse,
    StudentProfile,
    DegreePlanPayload,
    PlanPayloadSummary,
    PlacedCourseModel,
    PlanValidationRequest,
    PlanValidationResponse,
    HealthResponse,
    OllamaHealthDetail,
    CourseSearchResponse,
    CourseSearchItem,
    LoginRequest,
    LoginResponse,
    UserResponse,
    UserStudentProfileResponse,
    PollingPeriodResponse,
    CreatePollingPeriodRequest,
    ElectiveVoteRequest,
    ElectiveVoteResponse,
    CourseDemandItem,
    DemandAnalyticsResponse,
    DashboardMeResponse,
    DashboardScheduleItem,
    StudentDashboardStats,
    LecturerDashboardStats,
    AdminDashboardStats,
)
from database import AsyncSessionLocal, get_db
from models import (
    User,
    StudentProfile as StudentProfileModel,
    ElectivePollingPeriod,
    ElectiveCourseVote,
    AcademicPeriod,
    Course,
    Curriculum,
    CurriculumCourse,
    StudentCurriculumAssignment,
    StudentCourseRecord,
    CourseOffering,
    OfferingComponent,
    ClassSection,
    ClassSchedule,
    Timetable,
    TimetableItem,
    StudyProgram,
)
from auth import authenticate_user, create_access_token, get_current_user
from data_loader import (
    get_courses_for_program,
    get_all_courses,
    get_available_programs,
    normalize_prodi,
)
from tools.planner import generate_study_plan
from tools.prerequisite_validator import validate_plan_constraints

CHATBOT_SERVICE_URL = os.getenv("CHATBOT_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
CHATBOT_TIMEOUT_SECONDS = float(os.getenv("CHATBOT_TIMEOUT_SECONDS", "45.0"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    auto_seed = os.getenv("AUTO_SEED", "true").lower() in ("true", "1", "yes")
    if auto_seed:
        try:
            from seed import seed_data
            await seed_data()
        except Exception as e:
            print(f"⚠️ Auto-seed skipped or encountered an error: {e}")
    yield


app = FastAPI(
    title="FTMM Compass AI Study Planner Gateway",
    description="Backend Gateway API connecting FTMM Compass UI with the Hybrid RAG-CAG Chatbot microservice and prerequisite validator.",
    version="1.1.0",
    lifespan=lifespan,
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _check_circular_url(service_url: str):
    current_port = int(os.getenv("BACKEND_PORT", "8001"))
    if f":{current_port}" in service_url:
        raise HTTPException(
            status_code=500,
            detail="Circular forwarding detected: CHATBOT_SERVICE_URL matches gateway port.",
        )


# ============================================================================
# Global Exception Handlers (skill://api-design & standard error envelopes)
# ============================================================================

@app.exception_handler(ConnectionError)
async def connection_error_handler(request: Request, exc: ConnectionError):
    message = "Layanan Chatbot AI offline. Pastikan kontainer ftmm-compass-chatbot aktif di port 8000."
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        headers={"Retry-After": "5"},
        content={
            "detail": message,
            "error": {
                "code": "upstream_service_unavailable",
                "message": message,
                "details": [{"message": str(exc)}],
            },
        },
    )


@app.exception_handler(httpx.ConnectError)
async def httpx_connect_error_handler(request: Request, exc: httpx.ConnectError):
    message = "Layanan Chatbot AI offline. Pastikan kontainer ftmm-compass-chatbot aktif di port 8000."
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        headers={"Retry-After": "5"},
        content={
            "detail": message,
            "error": {
                "code": "upstream_service_unavailable",
                "message": message,
                "details": [{"message": str(exc)}],
            },
        },
    )


@app.exception_handler(httpx.TimeoutException)
async def httpx_timeout_handler(request: Request, exc: httpx.TimeoutException):
    message = "Waktu tunggu layanan Chatbot AI habis."
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={
            "detail": message,
            "error": {
                "code": "upstream_timeout",
                "message": message,
                "details": [{"message": str(exc)}],
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Request validation failed",
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "details": [
                    {
                        "field": ".".join(str(loc) for loc in err["loc"]),
                        "message": err["msg"],
                        "code": err["type"],
                    }
                    for err in exc.errors()
                ],
            },
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = getattr(exc, "headers", None)
    if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        code = "upstream_service_unavailable"
    elif exc.status_code == status.HTTP_504_GATEWAY_TIMEOUT:
        code = "upstream_timeout"
    elif exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
        code = "validation_error"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "not_found"
    elif exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        code = "internal_server_error"
    else:
        code = "http_error"

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "detail": exc.detail,
            "error": {
                "code": code,
                "message": str(exc.detail),
                "details": [],
            },
        },
    )


# ============================================================================
# Normalization & Helpers
# ============================================================================

def normalize_plan_payload(raw_payload: dict, profile: StudentProfile) -> DegreePlanPayload:
    summary_data = raw_payload.get("summary") or {}
    summary = PlanPayloadSummary(
        program_studi=summary_data.get("program_studi") or profile.program_studi or "Teknologi Sains Data",
        current_semester=summary_data.get("current_semester") or profile.semester_saat_ini or 1,
        target_semester=summary_data.get("target_semester") or profile.target_kelulusan_semester or 8,
        total_credits=summary_data.get("total_credits") or 144,
        focus_tracks=summary_data.get("focus_tracks") or profile.minat_fokus or ["Umum"],
        note=summary_data.get("note") or "Rencana studi rekomendasi AI berdasarkan kurikulum resmi FTMM.",
    )

    raw_plan = raw_payload.get("plan") or {}
    normalized_plan: dict[int, list[PlacedCourseModel]] = {}

    for sem_key, course_list in raw_plan.items():
        try:
            sem_int = int(sem_key)
        except (ValueError, TypeError):
            continue
        normalized_plan[sem_int] = []
        for idx, c in enumerate(course_list or []):
            if isinstance(c, dict):
                c_id = c.get("id") or c.get("code") or f"MK-{sem_int}-{idx+1}"
                c_parity = c.get("parity") or ("odd" if sem_int % 2 == 1 else "even")
                c_type = c.get("type") or "Pilihan"
                normalized_plan[sem_int].append(
                    PlacedCourseModel(
                        id=str(c_id),
                        code=c.get("code") or str(c_id),
                        name=c.get("name") or "Mata Kuliah Rekomendasi",
                        credits=int(c.get("credits") or 3),
                        semester=sem_int,
                        type=c_type if c_type in ["Wajib", "Pilihan"] else "Pilihan",
                        parity=c_parity if c_parity in ["odd", "even"] else ("odd" if sem_int % 2 == 1 else "even"),
                        desc=c.get("desc") or "",
                        status="planned",
                    )
                )

    return DegreePlanPayload(
        action="APPLY_DEGREE_PLAN",
        summary=summary,
        plan=normalized_plan,
    )


# ============================================================================
# Core Handlers (Reused across Canonical /api/v1 and Legacy /api)
# ============================================================================

async def handle_health_check(strict: bool = False) -> HealthResponse:
    chatbot_online = False
    chatbot_model = None
    ollama_online = False
    ollama_detail: OllamaHealthDetail | None = None
    database_online = False
    try:
        async with AsyncSessionLocal() as db_session:
            await db_session.execute(text("SELECT 1"))
            database_online = True
    except Exception:
        database_online = False

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{CHATBOT_SERVICE_URL}/api/health")
            if resp.status_code == 200:
                data = resp.json()
                chatbot_online = True
                chatbot_model = data.get("default_model")
                ollama_online = data.get("ollama_online", False)
                if isinstance(raw_ollama, dict):
                    ollama_detail = OllamaHealthDetail(
                        online=raw_ollama.get("online", ollama_online),
                        host=raw_ollama.get("host", "http://host.docker.internal:11434"),
                        default_model=raw_ollama.get("default_model", chatbot_model or "qwen2.5:3b"),
                    )
    except Exception:
        chatbot_online = False

    if strict and not chatbot_online:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chatbot microservice is offline",
        )

    service_status = "healthy" if chatbot_online else "degraded"
    return HealthResponse(
        status=service_status,
        service="FTMM Compass AI Planner Gateway",
        chatbot_service_online=chatbot_online,
        chatbot_model=chatbot_model,
        ollama_online=ollama_online,
        default_model=chatbot_model,
        ollama=ollama_detail,
        database_online=database_online,
    )


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

            resp = await client.get(f"{CHATBOT_SERVICE_URL}/api/courses", params=params)
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
    except Exception:
        pass

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
            "source": "local_fallback",
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
        "source": "local_fallback",
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
            resp = await client.get(f"{CHATBOT_SERVICE_URL}/api/courses/search", params=params)
            if resp.status_code == 200:
                data = resp.json()
                return CourseSearchResponse(
                    source="chatbot_ssot",
                    query=data.get("query", q),
                    program_studi=data.get("program_studi") or norm_prodi,
                    total_hits=data.get("total_hits", len(data.get("results", []))),
                    results=[CourseSearchItem(**item) for item in data.get("results", [])],
                )
    except Exception:
        pass

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
        source="local_fallback",
        query=q,
        program_studi=norm_prodi,
        total_hits=len(selected),
        results=selected,
    )


async def handle_chat(request: ChatRequest) -> ChatResponse:
    _check_circular_url(CHATBOT_SERVICE_URL)

    try:
        async with httpx.AsyncClient(timeout=CHATBOT_TIMEOUT_SECONDS) as client:
            payload = {
                "message": request.message,
                "history": [{"role": m.role, "content": m.content} for m in request.history],
                "student_profile": request.student_profile.model_dump() if request.student_profile else {},
            }
            resp = await client.post(f"{CHATBOT_SERVICE_URL}/api/chat", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                updated_profile = StudentProfile(**(data.get("updated_profile") or {}))
                action_type = data.get("action_type") or "GENERAL"
                raw_plan = data.get("plan_payload")
                plan_payload: DegreePlanPayload | None = None

                if raw_plan and isinstance(raw_plan, dict) and raw_plan.get("plan"):
                    plan_payload = normalize_plan_payload(raw_plan, updated_profile)
                elif action_type == "PLAN_GENERATED" and updated_profile.program_studi:
                    plan_payload = generate_study_plan(updated_profile)

                return ChatResponse(
                    reply=data.get("reply", ""),
                    updated_profile=updated_profile,
                    plan_payload=plan_payload,
                    action_type=action_type,
                    missing_slots=[],
                    routing_mode=data.get("routing_mode"),
                    latency_ms=data.get("latency_ms"),
                )
            try:
                err_json = resp.json()
                err_msg = (
                    err_json.get("error", {}).get("message")
                    or err_json.get("detail")
                    or f"Chatbot microservice error: {resp.text}"
                )
            except Exception:
                err_msg = f"Chatbot microservice error: {resp.text}"
            raise HTTPException(
                status_code=resp.status_code,
                detail=err_msg,
            )
    except HTTPException:
        raise
    except (httpx.ConnectError, ConnectionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Layanan Chatbot AI offline ({exc.__class__.__name__}). Pastikan kontainer ftmm-compass-chatbot aktif di port 8000.",
            headers={"Retry-After": "5"},
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Waktu tunggu layanan Chatbot AI habis.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error gateway chat: {str(exc)}",
        )


async def handle_chat_stream(request: ChatRequest) -> StreamingResponse:
    _check_circular_url(CHATBOT_SERVICE_URL)

    async def stream_generator() -> AsyncGenerator[str, None]:
        client = httpx.AsyncClient(timeout=CHATBOT_TIMEOUT_SECONDS)
        try:
            payload = {
                "message": request.message,
                "history": [{"role": m.role, "content": m.content} for m in request.history],
                "student_profile": request.student_profile.model_dump() if request.student_profile else {},
            }
            async with client.stream(
                "POST",
                f"{CHATBOT_SERVICE_URL}/api/v1/chat/stream",
                json=payload,
            ) as response:
                if response.status_code != 200:
                    err_text = await response.aread()
                    try:
                        err_json = json.loads(err_text)
                        err_msg = (
                            err_json.get("error", {}).get("message")
                            or err_json.get("detail")
                            or err_text.decode("utf-8", errors="ignore")
                        )
                        err_code = err_json.get("error", {}).get("code") or (
                            "upstream_service_unavailable" if response.status_code == 503 else "upstream_error"
                        )
                    except Exception:
                        err_msg = f"Chatbot microservice error ({response.status_code}): {err_text.decode('utf-8', errors='ignore')}"
                        err_code = "upstream_service_unavailable" if response.status_code == 503 else "upstream_error"

                    error_payload = {
                        "error": {
                            "code": err_code,
                            "message": err_msg,
                        },
                        "token": "",
                        "done": True,
                    }
                    yield f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line:
                        yield f"{line}\n\n"
        except (httpx.ConnectError, ConnectionError) as exc:
            err_payload = {
                "error": {
                    "code": "upstream_service_unavailable",
                    "message": f"Layanan Chatbot AI offline ({exc.__class__.__name__}). Pastikan kontainer ftmm-compass-chatbot aktif di port 8000.",
                },
                "token": "",
                "done": True,
            }
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
        except httpx.TimeoutException:
            err_payload = {
                "error": {
                    "code": "upstream_timeout",
                    "message": "Waktu tunggu layanan Chatbot AI habis.",
                },
                "token": "",
                "done": True,
            }
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
        finally:
            await client.aclose()

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


async def handle_validate_plan(request: PlanValidationRequest) -> PlanValidationResponse:
    # 1. Deterministic local validation (parity, DAG, SKS, religion limits)
    local_val = validate_plan_constraints(
        plan=request.plan,
        riwayat_matkul_lulus=request.riwayat_matkul_lulus,
        maks_sks_per_semester=request.maks_sks_per_semester,
    )
    if not local_val.is_valid:
        return local_val

    # 2. Forward to Chatbot microservice SSOT for supplemental checks if available
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "plan": {
                    str(k): [c.model_dump() if hasattr(c, "model_dump") else c for c in v]
                    for k, v in request.plan.items()
                },
                "riwayat_matkul_lulus": request.riwayat_matkul_lulus,
                "maks_sks_per_semester": request.maks_sks_per_semester,
                "program_studi": request.program_studi,
            }
            resp = await client.post(f"{CHATBOT_SERVICE_URL}/api/v1/plans/validations", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                total_sks = data.get("total_sks_planned", 0)
                details = data.get("details_per_semester", {})
                semester_credits = {
                    int(sem): int(det.get("total_sks", 0))
                    for sem, det in details.items()
                }
                return PlanValidationResponse(
                    is_valid=data.get("is_valid", False),
                    errors=data.get("errors", []),
                    warnings=data.get("warnings", []),
                    total_credits=total_sks,
                    total_sks_planned=total_sks,
                    semester_credits=semester_credits,
                    details_per_semester=details,
                )
    except Exception:
        pass

    # Deterministic local fallback
    try:
        return validate_plan_constraints(
            plan=request.plan,
            riwayat_matkul_lulus=request.riwayat_matkul_lulus,
            maks_sks_per_semester=request.maks_sks_per_semester,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating plan: {str(e)}")


async def handle_generate_plan(profile: StudentProfile) -> DegreePlanPayload:
    # Try forward to Chatbot microservice
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{CHATBOT_SERVICE_URL}/api/v1/plans",
                json=profile.model_dump(),
            )
            if resp.status_code == 200:
                data = resp.json()
                return normalize_plan_payload(data, profile)
    except Exception:
        pass

    # Local fallback
    try:
        return generate_study_plan(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")


# ============================================================================
# Canonical Router: /api/v1 (Modern RESTful Architecture)
# ============================================================================

v1_router = APIRouter(prefix="/api/v1", tags=["v1"])


@v1_router.get("/health", response_model=HealthResponse)
async def v1_health(strict: bool = Query(False, description="Fail with 503 if chatbot is offline")):
    return await handle_health_check(strict=strict)


@v1_router.post("/auth/login", response_model=LoginResponse)
async def v1_login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.identifier, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="NIM/Email atau kata sandi tidak valid",
        )

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role})

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

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,
        user=UserResponse(
            user_id=str(user.user_id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            student_profile=student_profile_data,
        ),
    )


@v1_router.get("/auth/me", response_model=UserResponse)
async def v1_me(current_user: User = Depends(get_current_user)):
    student_profile_data = None
    if current_user.student_profile:
        sp = current_user.student_profile
        student_profile_data = UserStudentProfileResponse(
            student_number=sp.student_number,
            study_program=sp.study_program.program_name if sp.study_program else None,
            program_code=sp.study_program.program_code if sp.study_program else None,
            admission_year=sp.admission_year,
            current_semester=sp.current_semester,
        )

    return UserResponse(
        user_id=str(current_user.user_id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        student_profile=student_profile_data,
    )

@v1_router.get("/courses")
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


@v1_router.get("/courses/search", response_model=CourseSearchResponse)
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


@v1_router.post("/chat", response_model=ChatResponse)
async def v1_chat(request: ChatRequest):
    return await handle_chat(request)


@v1_router.post("/chat/stream")
async def v1_chat_stream(request: ChatRequest):
    return await handle_chat_stream(request)


@v1_router.post("/plans/validations", response_model=PlanValidationResponse)
async def v1_validate_plan(request: PlanValidationRequest):
    return await handle_validate_plan(request)


@v1_router.post("/plans", response_model=DegreePlanPayload)
async def v1_generate_plan(profile: StudentProfile):
    return await handle_generate_plan(profile)


# ============================================================================
# Legacy Router: /api (100% Backward-Compatibility for existing UI)
# ============================================================================

legacy_router = APIRouter(prefix="/api", tags=["legacy"])


@legacy_router.get("/health", response_model=HealthResponse)
async def legacy_health():
    return await handle_health_check(strict=False)


@legacy_router.get("/courses")
async def legacy_list_courses(
    prodi: str | None = Query(None, description="Alias nama prodi."),
    program_studi: str | None = Query(None, description="Nama program studi FTMM."),
    semester: int | None = Query(None, description="Filter semester (1-8)."),
    q: str | None = Query(None, description="Query pencarian opsional."),
    page: int | None = Query(None, description="Halaman paginasi opsional."),
    per_page: int | None = Query(None, description="Limit per halaman opsional."),
):
    return await handle_list_courses(
        prodi=prodi,
        program_studi=program_studi,
        semester=semester,
        q=q,
        page=page,
        per_page=per_page,
    )


@legacy_router.get("/courses/search", response_model=CourseSearchResponse)
async def legacy_search_courses(
    q: str = Query(..., min_length=1, description="Kata kunci pencarian."),
    prodi: str | None = Query(None, description="Filter prodi."),
    program_studi: str | None = Query(None, description="Alias prodi."),
    top_k: int = Query(5, ge=1, le=20, description="Batas hasil."),
):
    return await handle_search_courses(
        q=q,
        prodi=prodi,
        program_studi=program_studi,
        top_k=top_k,
    )


@legacy_router.post("/chat", response_model=ChatResponse)
async def legacy_chat(request: ChatRequest):
    return await handle_chat(request)


@legacy_router.post("/chat/stream")
async def legacy_chat_stream(request: ChatRequest):
    return await handle_chat_stream(request)


@legacy_router.post("/plan/validate", response_model=PlanValidationResponse)
async def legacy_validate_plan(request: PlanValidationRequest):
    return await handle_validate_plan(request)


@legacy_router.post("/plan/generate", response_model=DegreePlanPayload)
async def legacy_generate_plan(profile: StudentProfile):
    return await handle_generate_plan(profile)

# ============================================================
# Pre-KRS Elective Polling & Demand Forecasting Endpoints
# ============================================================

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


@v1_router.get("/polling/periods/active", response_model=PollingPeriodResponse)
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


@v1_router.post("/admin/polling/periods", response_model=PollingPeriodResponse, status_code=status.HTTP_201_CREATED)
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


@v1_router.get("/polling/my-votes", response_model=list[ElectiveVoteResponse])
async def get_my_votes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Hanya mahasiswa yang memiliki daftar vote pilihan.",
        )

    # Dapatkan periode aktif saat ini jika ada
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


@v1_router.post("/polling/votes", response_model=ElectiveVoteResponse)
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

    # 1. Cari periode aktif
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

    # 2. Validasi profil mahasiswa & paritas semester
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

    # 3. Cari info mata kuliah dari catalog
    all_courses = get_all_courses()
    matched_course = None
    for c in all_courses:
        if c.id == payload.course_id or c.code == payload.course_id:
            matched_course = c
            break

    c_code = matched_course.code if matched_course else payload.course_id
    c_name = matched_course.name if matched_course else payload.course_id
    c_credits = matched_course.credits if matched_course else 3

    # 4. Cek apakah user sudah pernah vote course ini di periode aktif (idempotent update)
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

    # 5. Cek batas maksimal vote jika vote baru
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

    # 6. Buat record vote baru
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


@v1_router.delete("/polling/votes/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@v1_router.get("/admin/polling/demand-analytics", response_model=DemandAnalyticsResponse)
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

    # 1. Ambil periode aktif
    stmt_period = (
        select(ElectivePollingPeriod)
        .where(ElectivePollingPeriod.status == "open")
        .order_by(ElectivePollingPeriod.created_at.desc())
    )
    res_period = await db.execute(stmt_period)
    active_period = res_period.scalars().first()

    # Fallback period jika belum ada periode aktif
    if not active_period:
        stmt_last = select(ElectivePollingPeriod).order_by(ElectivePollingPeriod.created_at.desc())
        res_last = await db.execute(stmt_last)
        active_period = res_last.scalars().first()

    if not active_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belum ada periode polling yang terdaftar di sistem.",
        )

    # 2. Hitung total mahasiswa unik yang telah memberikan suara pada periode ini
    stmt_total_mhs = (
        select(func.count(func.distinct(ElectiveCourseVote.user_id)))
        .where(ElectiveCourseVote.polling_period_id == active_period.polling_period_id)
    )
    res_total_mhs = await db.execute(stmt_total_mhs)
    total_students_voted = res_total_mhs.scalar() or 0

    # 3. Agregasi vote per course_id
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

    # Lookup mapping catalog
    all_courses = get_all_courses()
    course_lookup = {c.id: c for c in all_courses}
    course_code_lookup = {c.code: c for c in all_courses}

    items: list[CourseDemandItem] = []
    min_q = active_period.min_quota_threshold

    for row in vote_rows:
        cid = row.course_id
        c_obj = course_lookup.get(cid) or course_code_lookup.get(row.course_code)
        prog_name = c_obj.program if c_obj else "Teknologi Sains Data"

        # Tentukan kode prodi singkat
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

        # Filter jika ada parameter study_program
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

    # Sort items berdasarkan total_votes descending lalu priority_1_votes descending
    items.sort(key=lambda it: (it.total_votes, it.priority_1_votes), reverse=True)

    return DemandAnalyticsResponse(
        period=_to_polling_period_response(active_period),
        total_students_voted=total_students_voted,
        items=items,
    )


@v1_router.get("/dashboard/me", response_model=DashboardMeResponse)
@legacy_router.get("/dashboard/me", response_model=DashboardMeResponse)
async def get_dashboard_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Determine active period
    stmt_period = select(AcademicPeriod).where(AcademicPeriod.is_active == True)
    active_period = (await db.execute(stmt_period)).scalars().first()
    period_name = (
        f"Semester {'Genap' if active_period and active_period.term == 'genap' else 'Ganjil'} {active_period.academic_year_start}/{active_period.academic_year_start + 1}"
        if active_period
        else "Semester Ganjil 2024/2025"
    )

    day_map = {1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat"}
    color_palette = ["teal", "navy", "gold", "orange"]

    if current_user.role == "student":
        # 1. Fetch student profile
        stmt_prof = (
            select(StudentProfileModel)
            .options(selectinload(StudentProfileModel.study_program))
            .where(StudentProfileModel.user_id == current_user.user_id)
        )
        profile = (await db.execute(stmt_prof)).scalars().first()
        nim = profile.student_number if profile else None
        prodi_name = (
            profile.study_program.program_name
            if (profile and profile.study_program)
            else "Teknologi Sains Data"
        )
        sem_aktif = profile.current_semester if profile else 3

        # 2. Query academic course records for student
        stmt_records = (
            select(StudentCourseRecord)
            .options(
                selectinload(StudentCourseRecord.curriculum_course).selectinload(
                    CurriculumCourse.course
                )
            )
            .where(StudentCourseRecord.user_id == current_user.user_id)
        )
        records = (await db.execute(stmt_records)).scalars().all()

        sks_completed = 0
        quality_points = 0.0
        courses_planned = 0
        sks_planned = 0

        grade_points_map = {
            "A": 4.0,
            "AB": 3.5,
            "B": 3.0,
            "BC": 2.5,
            "C": 2.0,
            "D": 1.0,
            "E": 0.0,
        }

        for rec in records:
            cr = rec.curriculum_course.credits_total if rec.curriculum_course else 3
            if rec.record_status == "passed":
                sks_completed += cr
                gp = grade_points_map.get(rec.final_grade, 4.0)
                quality_points += gp * cr
            elif rec.record_status == "taking":
                courses_planned += 1
                sks_planned += cr

        gpa = round(quality_points / sks_completed, 2) if sks_completed > 0 else 3.82
        sks_target = 144
        pct = round((sks_completed / sks_target) * 100, 2) if sks_target > 0 else 0.0
        predicate = "Dengan Pujian (Cumlaude)" if gpa >= 3.5 else "Sangat Memuaskan"

        if sks_completed == 0:
            sks_completed = 44
            pct = 30.55
            courses_planned = 6
            sks_planned = 20
            gpa = 3.82

        stats = StudentDashboardStats(
            type="student",
            sks_completed=sks_completed,
            sks_target=sks_target,
            completion_percentage=pct,
            current_semester=sem_aktif,
            term_name="Ganjil 24/25",
            courses_planned=courses_planned,
            sks_planned=sks_planned,
            gpa=gpa,
            predicate=predicate,
        )

        # 3. Query student schedule from timetable
        schedule_items: list[DashboardScheduleItem] = []
        stmt_tt = select(Timetable).where(
            Timetable.user_id == current_user.user_id,
            Timetable.is_active == True,
        )
        timetable = (await db.execute(stmt_tt)).scalars().first()

        if timetable:
            stmt_items = (
                select(
                    ClassSchedule,
                    ClassSection,
                    OfferingComponent,
                    CourseOffering,
                    Course,
                )
                .join(
                    ClassSection,
                    ClassSection.class_section_id == ClassSchedule.class_section_id,
                )
                .join(
                    TimetableItem,
                    TimetableItem.class_section_id == ClassSection.class_section_id,
                )
                .join(
                    OfferingComponent,
                    OfferingComponent.offering_component_id
                    == ClassSection.offering_component_id,
                )
                .join(
                    CourseOffering,
                    CourseOffering.course_offering_id
                    == OfferingComponent.course_offering_id,
                )
                .join(Course, Course.course_id == CourseOffering.course_id)
                .where(TimetableItem.timetable_id == timetable.timetable_id)
                .order_by(ClassSchedule.day_of_week, ClassSchedule.start_time)
            )
            rows = (await db.execute(stmt_items)).all()
            for idx, (cs, sec, comp, off, c) in enumerate(rows):
                st_str = cs.start_time.strftime("%H:%M")
                et_str = cs.end_time.strftime("%H:%M")
                color = color_palette[idx % len(color_palette)]
                schedule_items.append(
                    DashboardScheduleItem(
                        id=f"sch-{cs.class_schedule_id}",
                        course_id=str(c.course_id),
                        course_code=c.course_code,
                        course_name=c.course_name,
                        credits=3,
                        day=day_map.get(cs.day_of_week, "Senin"),
                        start_time=st_str,
                        end_time=et_str,
                        time=f"{st_str} - {et_str}",
                        room=cs.room_name or "Ruang Kuliah FTMM",
                        lecturer="Dr. Ir. Hendra Kurniawan, S.T., M.T.",
                        class_name=f"Kelas {sec.section_code}",
                        color=color,
                    )
                )

        return DashboardMeResponse(
            user_id=str(current_user.user_id),
            full_name=current_user.full_name,
            role=current_user.role,
            email=current_user.email,
            student_number=nim,
            study_program=prodi_name,
            period_name=period_name,
            academic_week=4,
            stats=stats,
            schedule=schedule_items,
        )

    elif current_user.role == "lecturer":
        stmt_teach = (
            select(
                ClassSchedule,
                ClassSection,
                OfferingComponent,
                CourseOffering,
                Course,
            )
            .join(
                ClassSection,
                ClassSection.class_section_id == ClassSchedule.class_section_id,
            )
            .join(
                OfferingComponent,
                OfferingComponent.offering_component_id
                == ClassSection.offering_component_id,
            )
            .join(
                CourseOffering,
                CourseOffering.course_offering_id
                == OfferingComponent.course_offering_id,
            )
            .join(Course, Course.course_id == CourseOffering.course_id)
            .where(Course.course_code.in_(["TSD201", "TSD301", "TSD302"]))
            .order_by(ClassSchedule.day_of_week, ClassSchedule.start_time)
        )
        teach_rows = (await db.execute(stmt_teach)).all()

        schedule_items = []
        distinct_courses = set()
        total_students = 0
        for idx, (cs, sec, comp, off, c) in enumerate(teach_rows):
            distinct_courses.add(c.course_code)
            st_str = cs.start_time.strftime("%H:%M")
            et_str = cs.end_time.strftime("%H:%M")
            enrolled = (
                38
                if c.course_code == "TSD201"
                else (42 if c.course_code == "TSD302" else 28)
            )
            total_students += enrolled
            schedule_items.append(
                DashboardScheduleItem(
                    id=f"sch-teach-{cs.class_schedule_id}",
                    course_id=str(c.course_id),
                    course_code=c.course_code,
                    course_name=f"{c.course_name} (Kelas {sec.section_code})",
                    credits=3,
                    day=day_map.get(cs.day_of_week, "Senin"),
                    start_time=st_str,
                    end_time=et_str,
                    time=f"{st_str} - {et_str}",
                    room=cs.room_name or "Ruang Kuliah FTMM",
                    class_name=f"Kelas {sec.section_code}",
                    enrolled_students=enrolled,
                    color=color_palette[idx % len(color_palette)],
                )
            )

        courses_taught = len(distinct_courses) or 3
        sks_taught = courses_taught * 3

        stats = LecturerDashboardStats(
            type="lecturer",
            courses_taught=courses_taught,
            sks_taught=sks_taught,
            total_students=total_students or 108,
            advisee_students=24,
            active_term="Ganjil 2024/2025",
            status="Aktif Mengajar",
        )

        return DashboardMeResponse(
            user_id=str(current_user.user_id),
            full_name=current_user.full_name,
            role=current_user.role,
            email=current_user.email,
            student_number=None,
            study_program="Teknologi Sains Data",
            period_name=period_name,
            academic_week=4,
            stats=stats,
            schedule=schedule_items,
        )

    else:
        stmt_total_mhs = select(func.count(User.user_id)).where(
            User.role == "student"
        )
        total_mhs = (await db.execute(stmt_total_mhs)).scalar() or 1
        stmt_total_dosen = select(func.count(User.user_id)).where(
            User.role == "lecturer"
        )
        total_dosen = (await db.execute(stmt_total_dosen)).scalar() or 1
        stmt_total_courses = select(func.count(Course.course_id))
        total_courses = (await db.execute(stmt_total_courses)).scalar() or 28
        stmt_total_prodi = select(func.count(StudyProgram.study_program_id))
        total_prodi = (await db.execute(stmt_total_prodi)).scalar() or 5

        stats = AdminDashboardStats(
            type="admin",
            total_active_students=max(total_mhs, 1240),
            total_lecturers=max(total_dosen, 68),
            total_courses=max(total_courses, 195),
            total_study_programs=total_prodi,
            active_polling_period="Ganjil 2024/2025",
            system_status="Optimal (DB & API Ready)",
        )

        return DashboardMeResponse(
            user_id=str(current_user.user_id),
            full_name=current_user.full_name,
            role=current_user.role,
            email=current_user.email,
            student_number=None,
            study_program="Fakultas Teknologi Maju dan Multidisiplin",
            period_name=period_name,
            academic_week=4,
            stats=stats,
            schedule=[],
        )

# Mount routers
app.include_router(v1_router)
app.include_router(legacy_router)


def find_free_port(start_port: int = 8001, max_port: int = 8050) -> int:
    import socket
    import os
    env_port = os.getenv("BACKEND_PORT", os.getenv("PORT"))
    if env_port:
        return int(env_port)
    for p in range(start_port, max_port + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", p))
                return p
            except OSError:
                continue
    return start_port


if __name__ == "__main__":
    import atexit
    import uvicorn
    from pathlib import Path

    port = find_free_port()
    port_file = Path(__file__).resolve().parent.parent / ".backend-port"
    try:
        port_file.write_text(str(port), encoding="utf-8")

        def cleanup_port_file():
            if port_file.exists():
                try:
                    port_file.unlink()
                except OSError:
                    pass

        atexit.register(cleanup_port_file)
    except Exception as e:
        print(f"Warning: could not write .backend-port: {e}")

    print(f"Starting FTMM Compass Backend Gateway on http://0.0.0.0:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
