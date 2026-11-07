"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import logging
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
import httpx
from fastapi import APIRouter, HTTPException
from schemas import (
    StudentProfile,
    DegreePlanPayload,
    PlanPayloadSummary,
    PlacedCourseModel,
    PlanValidationRequest,
    PlanValidationResponse,
)

import settings
from tools.planner import generate_study_plan
from tools.prerequisite_validator import validate_plan_constraints

logger = logging.getLogger("ftmm_compass.gateway")

router = APIRouter()


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
            resp = await client.post(f"{settings.CHATBOT_SERVICE_URL}/api/v1/plans/validations", json=payload)
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
    except Exception as exc:
        logger.debug("%s", exc)

    return local_val


async def handle_generate_plan(profile: StudentProfile) -> DegreePlanPayload:
    # Try forward to Chatbot microservice
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.CHATBOT_SERVICE_URL}/api/v1/plans",
                json=profile.model_dump(),
            )
            if resp.status_code == 200:
                data = resp.json()
                return normalize_plan_payload(data, profile)
    except Exception as exc:
        logger.debug("%s", exc)

    # Local fallback
    try:
        return generate_study_plan(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")


# ============================================================================


@router.post("/plans/validations", response_model=PlanValidationResponse)
async def v1_validate_plan(request: PlanValidationRequest):
    return await handle_validate_plan(request)


@router.post("/plans", response_model=DegreePlanPayload)
async def v1_generate_plan(profile: StudentProfile):
    return await handle_generate_plan(profile)


