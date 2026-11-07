"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
import json
import time
import uuid
import jwt
import httpx
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from schemas import (
    ChatRequest,
    ChatResponse,
    StudentProfile,
    DegreePlanPayload,
)
from database import AsyncSessionLocal
from models import (
    ChatLog,
)
from auth import SECRET_KEY, ALGORITHM

from rate_limit import limiter
import settings

router = APIRouter()


import logging

from api.plans import normalize_plan_payload
from tools.planner import generate_study_plan

logger = logging.getLogger("ftmm_compass.gateway")


def _check_circular_url(service_url: str):
    current_port = int(os.getenv("BACKEND_PORT", "8001"))
    if f":{current_port}" in service_url:
        raise HTTPException(
            status_code=500,
            detail="Circular forwarding detected: CHATBOT_SERVICE_URL matches gateway port.",
        )




def _resolve_user_id(request_data: ChatRequest, client_request: Request | None = None) -> uuid.UUID | None:
    if request_data.user_id:
        try:
            return uuid.UUID(str(request_data.user_id))
        except (ValueError, TypeError):
            pass
    if client_request and "authorization" in client_request.headers:
        auth_header = client_request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                sub = payload.get("sub")
                if sub:
                    return uuid.UUID(str(sub))
            except Exception:
                pass
    return None


async def log_chat_metadata(
    session_id: str,
    user_message: str,
    assistant_reply: str | None,
    action_type: str | None,
    routing_mode: str | None,
    latency_ms: float | None,
    user_id: uuid.UUID | None = None,
) -> None:
    try:
        async with AsyncSessionLocal() as db_session:
            chat_log = ChatLog(
                session_id=session_id,
                user_id=user_id,
                user_message=user_message,
                assistant_reply=assistant_reply,
                action_type=action_type,
                routing_mode=routing_mode,
                latency_ms=latency_ms,
            )
            db_session.add(chat_log)
            await db_session.commit()
    except Exception as exc:
        logger.warning(f"Failed to log chat metadata to PostgreSQL: {exc}")


async def handle_chat(request: ChatRequest, client_request: Request | None = None) -> ChatResponse:
    _check_circular_url(settings.CHATBOT_SERVICE_URL)
    start_time = time.perf_counter()
    session_id = request.session_id or (client_request.headers.get("x-session-id") if client_request else None) or "default"
    user_id = _resolve_user_id(request, client_request)

    try:
        async with httpx.AsyncClient(timeout=settings.CHATBOT_TIMEOUT_SECONDS) as client:
            payload = {
                "message": request.message,
                "history": [{"role": m.role, "content": m.content} for m in request.history],
                "student_profile": request.student_profile.model_dump() if request.student_profile else {},
            }
            resp = await client.post(f"{settings.CHATBOT_SERVICE_URL}/api/chat", json=payload)
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

                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                latency_ms = data.get("latency_ms") if data.get("latency_ms") is not None else elapsed_ms
                routing_mode = data.get("routing_mode")
                reply = data.get("reply", "")

                await log_chat_metadata(
                    session_id=session_id,
                    user_message=request.message,
                    assistant_reply=reply,
                    action_type=action_type,
                    routing_mode=routing_mode,
                    latency_ms=latency_ms,
                    user_id=user_id,
                )

                return ChatResponse(
                    reply=reply,
                    updated_profile=updated_profile,
                    plan_payload=plan_payload,
                    action_type=action_type,
                    missing_slots=[],
                    routing_mode=routing_mode,
                    latency_ms=latency_ms,
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


async def handle_chat_stream(request: ChatRequest, client_request: Request | None = None) -> StreamingResponse:
    _check_circular_url(settings.CHATBOT_SERVICE_URL)
    session_id = request.session_id or (client_request.headers.get("x-session-id") if client_request else None) or "default"
    user_id = _resolve_user_id(request, client_request)

    async def stream_generator() -> AsyncGenerator[str, None]:
        client = httpx.AsyncClient(timeout=settings.CHATBOT_TIMEOUT_SECONDS)
        start_time = time.perf_counter()
        accumulated_tokens: list[str] = []
        final_reply: str | None = None
        action_type: str | None = None
        routing_mode: str | None = None
        latency_ms: float | None = None

        try:
            payload = {
                "message": request.message,
                "history": [{"role": m.role, "content": m.content} for m in request.history],
                "student_profile": request.student_profile.model_dump() if request.student_profile else {},
            }
            async with client.stream(
                "POST",
                f"{settings.CHATBOT_SERVICE_URL}/api/v1/chat/stream",
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
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    await log_chat_metadata(
                        session_id=session_id,
                        user_message=request.message,
                        assistant_reply=err_msg,
                        action_type="ERROR",
                        routing_mode="ERROR",
                        latency_ms=elapsed_ms,
                        user_id=user_id,
                    )
                    yield f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line:
                        yield f"{line}\n\n"
                        if line.startswith("data:"):
                            raw_json = line[5:].strip()
                            try:
                                event_data = json.loads(raw_json)
                                if event_data.get("token"):
                                     accumulated_tokens.append(event_data["token"])
                                if event_data.get("done"):
                                    if event_data.get("reply"):
                                        final_reply = event_data["reply"]
                                    action_type = event_data.get("action_type")
                                    routing_mode = event_data.get("routing_mode")
                                    latency_ms = event_data.get("latency_ms")
                            except Exception:
                                pass

            assistant_reply = final_reply or "".join(accumulated_tokens)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if latency_ms is None:
                latency_ms = elapsed_ms
            await log_chat_metadata(
                session_id=session_id,
                user_message=request.message,
                assistant_reply=assistant_reply,
                action_type=action_type or "GENERAL",
                routing_mode=routing_mode,
                latency_ms=latency_ms,
                user_id=user_id,
            )
        except (httpx.ConnectError, ConnectionError) as exc:
            err_msg = f"Layanan Chatbot AI offline ({exc.__class__.__name__}). Pastikan kontainer ftmm-compass-chatbot aktif di port 8000."
            err_payload = {
                "error": {
                    "code": "upstream_service_unavailable",
                    "message": err_msg,
                },
                "token": "",
                "done": True,
            }
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            await log_chat_metadata(
                session_id=session_id,
                user_message=request.message,
                assistant_reply=err_msg,
                action_type="ERROR",
                routing_mode="ERROR",
                latency_ms=elapsed_ms,
                user_id=user_id,
            )
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
        except httpx.TimeoutException:
            err_msg = "Waktu tunggu layanan Chatbot AI habis."
            err_payload = {
                "error": {
                    "code": "upstream_timeout",
                    "message": err_msg,
                },
                "token": "",
                "done": True,
            }
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            await log_chat_metadata(
                session_id=session_id,
                user_message=request.message,
                assistant_reply=err_msg,
                action_type="ERROR",
                routing_mode="ERROR",
                latency_ms=elapsed_ms,
                user_id=user_id,
            )
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
        finally:
            await client.aclose()

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


async def handle_reset_chat_session(session_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.delete(f"{settings.CHATBOT_SERVICE_URL}/api/v1/chat/sessions/{session_id}")
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Sesi obrolan '{session_id}' berhasil direset.",
        "session_id": session_id,
    }




@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def v1_chat(request: Request, chat_request: ChatRequest):
    return await handle_chat(chat_request, client_request=request)


@router.post("/chat/stream")
@limiter.limit("20/minute")
async def v1_chat_stream(request: Request, chat_request: ChatRequest):
    return await handle_chat_stream(chat_request, client_request=request)


@router.delete("/chat/sessions/{session_id}")
async def v1_reset_chat_session(session_id: str):
    return await handle_reset_chat_session(session_id)


