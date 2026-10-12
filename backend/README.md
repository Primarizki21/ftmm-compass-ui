# FTMM Compass — Backend API

FastAPI backend gateway for FTMM Compass, powering academic study plan synthesis, Docker microservice proxying, and deterministic prerequisite graph validation.

---

## 🏗️ Architecture & Structure

```
backend/
├── app.py                     # FastAPI application, route endpoints, dynamic port discovery
├── schemas.py                 # Pydantic data schemas and validation contracts
├── data_loader.py             # Course catalog loader from frontend sources
├── tools/
│   ├── planner.py             # Deterministic 8-semester degree plan synthesis engine
│   └── prerequisite_validator.py # DAG-based prerequisite & semester parity validator
├── pyproject.toml             # Astral UV project definition & dependencies
├── uv.lock                    # Dependency lockfile
├── requirements.txt           # Standard pip dependency export
├── .env.example               # Environment variable templates
├── test_backend.py            # Unit test suite (planner, validator, agent flow)
└── test_api_endpoints.py      # HTTP integration test suite (FastAPI TestClient)
```

---

## 🚀 Setup & Running

This backend uses **[Astral UV](https://docs.astral.sh/uv/)** for fast, reliable Python dependency and environment management.

### Prerequisites

- Python `>= 3.10`
- [Astral UV](https://docs.astral.sh/uv/getting-started/installation/)
- [Ollama](https://ollama.ai) (optional, for local LLM inference with `qwen2.5:3b-instruct`)

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Configure Environment

Copy `.env.example` to `.env` (optional, sane defaults are provided):

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `BACKEND_PORT` | `8001` (auto-detect 8001–8050) | Listening port for FastAPI server |
| `HOST` | `0.0.0.0` | Bind host address |
| `CHATBOT_SERVICE_URL` | `http://127.0.0.1:8000` | Endpoint for Docker Hybrid RAG-CAG Chatbot microservice |
| `CHATBOT_TIMEOUT_SECONDS` | `45.0` | Timeout for Chatbot microservice calls |
| `CORS_ORIGINS` | `*` | Allowed CORS origins for frontend requests |
### 3. Run Development Server

From within `backend/`:
```bash
uv run python app.py
```

Or from project root using pnpm scripts:
```bash
pnpm dev:backend   # runs backend only
pnpm dev:all       # runs backend and Vite frontend concurrently
```

When started via `app.py`, the backend automatically finds an open port between 8001 and 8050, records it to `.backend-port`, and the Vite frontend proxy automatically routes `/api/*` calls.

---

## 📡 API Endpoints (Dual-Tier REST Architecture)

### Canonical REST Endpoints (`/api/v1`)
- `GET /api/v1/health` — Gateway health check, Ollama server status, and Docker Chatbot microservice connectivity.
- `GET /api/v1/courses` — Official course catalog with adaptive pagination (`page`, `per_page`), semester filtering, and search (`q`). Proxies to Chatbot microservice SSOT with local dataset fallback.
- `GET /api/v1/courses/search` — Keyword and semantic search for curriculum courses (`q`, `prodi`, `top_k`).
- `POST /api/v1/chat` — Conversational study planner gateway to Hybrid RAG-CAG microservice.
- `POST /api/v1/chat/stream` — Real-time Server-Sent Events (SSE) streaming endpoint for live token generation.
- `POST /api/v1/plans/validations` — Validate student study plans against prerequisite graph DAG and semester parity constraints.
- `POST /api/v1/plans` — Generate deterministic, DAG-validated degree plan from complete student profile.

### Legacy Compatibility Endpoints (`/api`)
- `GET /api/health` — Legacy health check alias.
- `GET /api/courses` — Legacy courses catalog alias.
- `GET /api/courses/search` — Legacy courses search alias.
- `POST /api/chat` — Legacy chat alias.
- `POST /api/chat/stream` — Legacy chat streaming alias.
- `POST /api/plan/validate` — Legacy plan validation alias.
- `POST /api/plan/generate` — Legacy plan generation alias.
- `GET /docs` — Interactive OpenAPI / Swagger UI documentation.

### Standard Error Envelope
All 4xx and 5xx responses follow the standardized error payload:
```json
{
  "detail": "Descriptive message",
  "error": {
    "code": "upstream_service_unavailable | upstream_timeout | validation_error | http_error",
    "message": "Descriptive message",
    "details": []
  }
}
```
## 🧪 Testing

Run automated unit and integration tests:

```bash
# Unit tests for planner, validator, and slot-filling logic
uv run python test_backend.py

# Integration tests for FastAPI endpoints
uv run python test_api_endpoints.py
```

---

## 🗄️ Database Coordination (PostgreSQL Baseline)

The relational schema baseline is specified in `RANCANGAN DIAGRAM AWAL.sql` (PostgreSQL 16). In this initial phase, the backend operates in-memory from curated catalog data and provides mock/rule contracts ready for integration with PostgreSQL tables managed by Darryl (Card #39 & #41).
