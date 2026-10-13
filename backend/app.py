import os
import json
import httpx
from typing import Any, AsyncGenerator
from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

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
    CourseCatalogResponse,
    PaginatedCourseResponse,
    PaginationMeta,
    PaginationLinks,
    CourseSearchResponse,
    CourseSearchItem,
)
from data_loader import (
    get_courses_for_program,
    get_all_courses,
    get_available_programs,
    normalize_prodi,
    FTMM_CURRICULUM,
)
from tools.planner import generate_study_plan
from tools.prerequisite_validator import validate_plan_constraints

CHATBOT_SERVICE_URL = os.getenv("CHATBOT_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
CHATBOT_TIMEOUT_SECONDS = float(os.getenv("CHATBOT_TIMEOUT_SECONDS", "45.0"))


app = FastAPI(
    title="FTMM Compass AI Study Planner Gateway",
    description="Backend Gateway API connecting FTMM Compass UI with the Hybrid RAG-CAG Chatbot microservice and prerequisite validator.",
    version="1.1.0",
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

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{CHATBOT_SERVICE_URL}/api/health")
            if resp.status_code == 200:
                data = resp.json()
                chatbot_online = True
                chatbot_model = data.get("default_model")
                ollama_online = data.get("ollama_online", False)
                raw_ollama = data.get("ollama")
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
    # Try forward to Chatbot microservice SSOT
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
