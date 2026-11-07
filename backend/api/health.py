"""Router HTTP. Setiap modul didaftarkan dua kali oleh app.py (v1 dan legacy)."""

import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)
import httpx
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import text
from schemas import (
    HealthResponse,
    OllamaHealthDetail,
)
from database import AsyncSessionLocal

import settings

router = APIRouter()


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
            resp = await client.get(f"{settings.CHATBOT_SERVICE_URL}/api/health")
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
        database_online=database_online,
    )



@router.get("/health", response_model=HealthResponse)
async def v1_health(strict: bool = Query(False, description="Fail with 503 if chatbot is offline")):
    return await handle_health_check(strict=strict)

