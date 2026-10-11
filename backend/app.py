import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    ChatRequest,
    ChatResponse,
    StudentProfile,
    DegreePlanPayload,
    PlanPayloadSummary,
    PlacedCourseModel,
    PlanValidationRequest,
    PlanValidationResponse,
)
from agent import process_chat_message, OLLAMA_BASE_URL, DEFAULT_MODEL
from data_loader import get_courses_for_program, normalize_prodi
from tools.planner import generate_study_plan
from tools.prerequisite_validator import validate_plan_constraints

CHATBOT_SERVICE_URL = os.getenv("CHATBOT_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
CHATBOT_TIMEOUT_SECONDS = float(os.getenv("CHATBOT_TIMEOUT_SECONDS", "45.0"))


app = FastAPI(
    title="FTMM Compass AI Study Planner API",
    description="Backend API with LangChain / LLM slot-filling agent and deterministic prerequisite validator for FTMM study planning.",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """
    Checks backend health, Ollama local server connectivity, and Docker Chatbot microservice.
    """
    ollama_online = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
    except Exception:
        ollama_online = False

    chatbot_online = False
    chatbot_model = None
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{CHATBOT_SERVICE_URL}/api/health")
            if resp.status_code == 200:
                data = resp.json()
                chatbot_online = True
                chatbot_model = data.get("default_model")
    except Exception:
        chatbot_online = False

    return {
        "status": "healthy",
        "service": "FTMM Compass AI Planner Gateway",
        "ollama_online": ollama_online,
        "chatbot_service_online": chatbot_online,
        "chatbot_model": chatbot_model,
        "default_model": DEFAULT_MODEL,
    }


@app.get("/api/courses")
async def list_courses(prodi: str = "Teknologi Sains Data"):
    """
    Returns the official course catalog for the specified study program.
    """
    norm_prodi = normalize_prodi(prodi) or "Teknologi Sains Data"
    courses = get_courses_for_program(norm_prodi)
    return {
        "program_studi": norm_prodi,
        "total_courses": len(courses),
        "courses": [c.model_dump() for c in courses],
    }


def normalize_plan_payload(raw_payload: dict, profile: StudentProfile) -> DegreePlanPayload:
    """
    Normalizes raw plan payload from AI microservice into full PlacedCourseModel instances
    so the frontend DegreePlanner receives valid objects with ids, parity, type, and status.
    """
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


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Conversational endpoint: forwards to Docker Hybrid RAG-CAG Chatbot microservice
    with automatic fallback to local slot-filling agent if microservice is offline.
    """
    # 1. Attempt call to Docker Hybrid RAG-CAG Chatbot microservice
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
                    # Generate complete deterministic 8-semester plan
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
    except Exception as ex:
        print(f"[Gateway Warning] Chatbot microservice call failed ({ex}), falling back to local agent.")

    # 2. Resilient fallback to local deterministic slot-filling agent
    try:
        response = await process_chat_message(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@app.post("/api/plan/generate", response_model=DegreePlanPayload)
async def generate_plan_endpoint(profile: StudentProfile):
    """
    Generates a deterministic, prerequisite-validated study plan from a complete student profile.
    """
    try:
        return generate_study_plan(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")


@app.post("/api/plan/validate", response_model=PlanValidationResponse)
async def validate_plan_endpoint(request: PlanValidationRequest):
    """
    Validates a student degree plan against prerequisite DAGs, parities, and SKS limits.
    """
    try:
        return validate_plan_constraints(
            plan=request.plan,
            riwayat_matkul_lulus=request.riwayat_matkul_lulus,
            maks_sks_per_semester=request.maks_sks_per_semester,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating plan: {str(e)}")


def find_free_port(start_port: int = 8000, max_port: int = 8050) -> int:
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

    print(f"Starting FTMM Compass Backend on http://0.0.0.0:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
