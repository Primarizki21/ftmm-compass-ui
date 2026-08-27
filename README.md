# FTMM Compass — Academic Advisor & Agentic Study Planner

Academic-advisor web app and AI study planner for **FTMM (Fakultas Teknologi Maju dan Multidisiplin), Universitas Airlangga**.

FTMM Compass helps students plan their degree journey across 8 semesters, explore official course catalogs, visualize prerequisite DAGs, manage weekly class timetables, and consult with **Compass AI** — an agentic study planner that personalizes course roadmaps based on student backgrounds, career interests, and strict FTMM academic constraints.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           FTMM COMPASS ARCHITECTURE                            │
└────────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                              Frontend (React 19)                             │
 │                                                                              │
 │   ┌───────────────┐   ┌────────────────┐   ┌─────────────────────────────┐   │
 │   │   Dashboard   │   │  CourseFinder  │   │        DegreePlanner        │   │
 │   │ (Stats & Sched)│  │ (Catalog & DAG)│   │ (8-Sem Roadmap & Drag/Drop) │   │
 │   └───────────────┘   └────────────────┘   └──────────────▲──────────────┘   │
 │                                                           │                  │
 │                                      [Apply AI Plan] ─────┘                  │
 │                                                           │                  │
 │                                            ┌──────────────┴──────────────┐   │
 │                                            │      Compass AI Chatbot     │   │
 │                                            │   (Interactive Action Card) │   │
 │                                            └──────────────▲──────────────┘   │
 └───────────────────────────────────────────────────────────┼──────────────────┘
                                                             │
                                                     REST API (Port 8000)
                                                             │
 ┌───────────────────────────────────────────────────────────▼──────────────────┐
 │                          Backend Service (FastAPI)                           │
 │                                                                              │
 │   ┌──────────────────────────────────────────────────────────────────────┐   │
 │   │               Agent Controller & Slot-Filling Engine                 │   │
 │   │        (Anti-Assumption Guardrails + Multi-turn Intent Parsing)      │   │
 │   └───────────────────┬───────────────────────────────┬──────────────────┘   │
 │                       │                               │                      │
 │                       ▼                               ▼                      │
 │        ┌─────────────────────────────┐ ┌───────────────────────────────┐     │
 │        │  Deterministic Tools Layer  │ │     Local LLM Integration     │     │
 │        │ • Prerequisite DAG Validator│ │ • Ollama / llama.cpp          │     │
 │        │ • Semester Parity Validator │ │ • Model: qwen2.5:7b-instruct  │     │
 │        │ • Curriculum Course Loader  │ │   (or qwen2.5:3b-instruct)    │     │
 │        │ • Study Plan Synthesizer    │ └───────────────────────────────┘     │
 │        └─────────────────────────────┘                                       │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Dashboard
- Ringkasan statistik akademik: SKS Kumulatif, Semester Aktif, dan IPK.
- Widget jadwal mingguan interaktif (*Timetable*) dengan deteksi bentrok jadwal (*conflict highlighting*).

### 2. Course Finder
- Pencarian dan filter katalog mata kuliah berdasarkan prodi, semester, SKS, dan tipe (Wajib/Pilihan).
- Modal detail mata kuliah dilengkapi **Prerequisite Flow Diagram (SVG)** untuk melihat rantai mata kuliah prasyarat.

### 3. Degree Planner
- Papan visual rencana studi 8 semester (*Roadmap*):
  - Mata kuliah **Wajib** otomatis terkunci di semesternya.
  - Mata kuliah **Pilihan** dapat dipindah-pindah via *drag and drop*.
  - Menegakkan aturan paritas semester (**Ganjil/Odd** $\rightarrow$ Semester 1, 3, 5, 7; **Genap/Even** $\rightarrow$ Semester 2, 4, 6, 8).
- Tab **Jadwal Aktif** untuk melihat distribusi kelas per semester.
- Banner rencana personalisasi saat rencana dari Compass AI diterapkan.

### 4. Compass AI (Agentic Study Planner)
- **Slot-Filling Conversational Flow**: Mengumpulkan profil mahasiswa (Prodi, Semester, Riwayat Kelulusan, Minat Karir, Target Kelulusan) melalui percakapan alami.
- **Anti-Assumption Guardrails**: Tidak pernah menebak atau mengasumsikan data mahasiswa yang belum jelas. Jika data kurang, agen akan menanyakan klarifikasi secara ramah.
- **Deterministic DAG & Parity Validation**: Menguji validitas rencana secara deterministik dengan aturan resmi kurikulum FTMM sebelum diserahkan ke mahasiswa.
- **One-Click UI Transfer**: Hasil rencana studi dilengkapi kartu aksi interaktif **[Terapkan Rencana Ini ke Degree Planner]** yang langsung mengisi papan visual roadmap.

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.7**
- **Vite 8** dev server & production bundler
- **Tailwind CSS v4** via `@tailwindcss/vite` (desain sistem dengan palet Navy, Gold, Teal)
- **Lucide React** untuk icon UI

### Backend
- **Python 3.10+** (tested on Python 3.14)
- **FastAPI** + **Uvicorn** (RESTful API & CORS)
- **Pydantic v2** (Strict data validation schemas)
- **HTTPX** (Asynchronous HTTP client for Ollama LLM)
- **Ollama / llama.cpp** (Local LLM inference: `qwen2.5:7b-instruct` / `qwen2.5:3b-instruct`)

---

## Cara Menjalankan Project

### 1. Prasyarat
- **Node.js 22** & **pnpm** (versi terkelola via `.mise.toml` atau manual).
- **Python 3.10+** dengan `venv`.
- *(Opsional untuk LLM lokal)*: **Ollama** terpasang di sistem.

---

### 2. Menjalankan Backend API

```bash
# Buat virtual environment jika belum ada
python3 -m venv backend/.venv

# Install dependencies backend
./backend/.venv/bin/pip install -r backend/requirements.txt

# Jalankan server FastAPI
./backend/.venv/bin/python backend/app.py
```
Backend akan aktif di **`http://localhost:8000`** (Swagger docs di `http://localhost:8000/docs`).

*(Opsional)* Jalankan model LLM lokal di terminal terpisah:
```bash
ollama run qwen2.5:7b-instruct
# atau versi hemat RAM:
ollama run qwen2.5:3b-instruct
```
> *Catatan: Jika Ollama sedang offline, backend secara otomatis menggunakan fallback slot-filling deterministik sehingga aplikasi tetap berjalan lancar.*

---

### 3. Menjalankan Frontend Web UI

```bash
# Install dependencies frontend
pnpm install

# Jalankan server development Vite
pnpm dev
```
Buka **`http://localhost:8443`** di browser.
Login dengan NIM dan password apa saja (simulasi autentikasi).

---

## Testing & QA Audit

Proyek ini dilengkapi rangkaian pengujian otomatis untuk memvalidasi fungsi backend dan integritas tipe frontend:

```bash
# 1. Jalankan unit test logic planner, validator, dan slot-filling agent
./backend/.venv/bin/python backend/test_backend.py

# 2. Jalankan integration test endpoint FastAPI
./backend/.venv/bin/python backend/test_api_endpoints.py

# 3. Jalankan build test & type check frontend
pnpm build

# 4. Format code
pnpm format
```

---

## Struktur Direktori

```
ftmm-compass-ui/
├── AI_PLANNER_PIPELINE.md         # Dokumentasi detail arsitektur Study Planner Agent
├── backend/                       # Python FastAPI Backend
│   ├── app.py                     # API server & endpoint routes (/api/chat, /api/courses, etc.)
│   ├── agent.py                   # Slot-filling conversational agent & Ollama controller
│   ├── schemas.py                 # Pydantic data models & payload contracts
│   ├── data_loader.py             # Loader kurikulum resmi FTMM & pemetaan prasyarat
│   ├── tools/
│   │   ├── prerequisite_validator.py  # Deterministic DAG, parity, & SKS validator
│   │   └── planner.py             # Study plan synthesis & elective scoring engine
│   ├── test_backend.py            # Unit tests for tools & agent dialog
│   ├── test_api_endpoints.py      # Integration tests for FastAPI endpoints
│   └── requirements.txt           # Python dependencies
├── src/                           # React Frontend
│   ├── App.tsx                    # Top-level state & planner payload wiring
│   ├── main.tsx                   # React DOM entrypoint
│   ├── data.ts                    # Core TypeScript models & mock schedules
│   ├── courseData.ts              # Catalog normalizer
│   ├── index.css                  # Tailwind v4 @theme design tokens
│   ├── utils.ts                   # cn() helper
│   ├── pages/
│   │   ├── Login.tsx              # Simulated authentication page
│   │   ├── Dashboard.tsx          # Academic stats & weekly timetable
│   │   ├── CourseFinder.tsx       # Course search & SVG prerequisite diagram
│   │   ├── DegreePlanner.tsx      # Interactive 8-semester roadmap
│   │   └── Chatbot.tsx            # Compass AI UI with interactive Action Cards
│   └── components/
│       └── TimetableGrid.tsx      # Weekly timetable grid component
├── RANCANGAN DIAGRAM AWAL.sql     # PostgreSQL 16 baseline schema
└── SCHEMA_REVIEW.md               # Database decision records
```

---

## Database Baseline — v2

`RANCANGAN DIAGRAM AWAL.sql` adalah baseline PostgreSQL 16 untuk arsitektur basis data akademik FTMM masa depan. Dokumen tinjauan keputusan database dapat dibaca di [`SCHEMA_REVIEW.md`](./SCHEMA_REVIEW.md).
