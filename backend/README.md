# FTMM Compass — Backend API

FastAPI backend service for FTMM Compass, powering academic study plan synthesis, conversational slot-filling agent (`Compass AI`), and deterministic prerequisite graph validation.

---

## 🏗️ Architecture & Structure

```
backend/
├── app.py                     # FastAPI application, route endpoints, dynamic port discovery
├── agent.py                   # Conversational slot-filling AI agent (Ollama / Qwen2.5)
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
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `LLM_MODEL` | `qwen2.5:3b-instruct` | LLM model tag for fallback inference |
| `CHATBOT_SERVICE_URL` | `http://127.0.0.1:8000` | Endpoint for Docker Hybrid RAG-CAG Chatbot microservice |
| `CHATBOT_TIMEOUT_SECONDS` | `45.0` | Timeout before triggering graceful fallback to local agent |
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

## 📡 API Endpoints

- `GET /api/health` — Health check, Ollama local server status, and Docker Chatbot microservice connectivity (`chatbot_service_online`).
- `GET /api/courses?prodi={nama}` — Retrieve course catalog with semester recommendations.
- `POST /api/chat` — Conversational study planner gateway: forwards queries to Hybrid RAG-CAG microservice, returns routing mode and latency, with automatic fallback to local slot-filling agent if microservice is offline.
- `POST /api/plan/generate` — Generate deterministic, DAG-validated degree plan from complete student profile.
- `POST /api/plan/validate` — Validate student study plans against prerequisite graph and semester parity constraints.
- `GET /docs` — Interactive OpenAPI / Swagger UI documentation.
---

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
