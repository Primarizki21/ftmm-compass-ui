import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    ChatRequest,
    ChatResponse,
    StudentProfile,
    DegreePlanPayload,
    PlanValidationRequest,
    PlanValidationResponse,
)
from agent import process_chat_message, OLLAMA_BASE_URL, DEFAULT_MODEL
from data_loader import get_courses_for_program, normalize_prodi
from tools.planner import generate_study_plan
from tools.prerequisite_validator import validate_plan_constraints


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
    Checks backend health and Ollama local server connectivity.
    """
    ollama_online = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
    except Exception:
        ollama_online = False

    return {
        "status": "healthy",
        "service": "FTMM Compass AI Planner",
        "ollama_online": ollama_online,
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


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main conversational endpoint: slot-filling, clarifying questions, and planner tool execution.
    """
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
