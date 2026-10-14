# FTMM Compass — Academic Advisor & Agentic Study Planner

Academic-advisor web app and AI study planner for **FTMM (Fakultas Teknologi Maju dan Multidisiplin), Universitas Airlangga**.

FTMM Compass helps students plan their degree journey across 8 semesters, explore official course catalogs, visualize prerequisite DAGs, manage weekly class timetables, and consult with **Compass AI** — an agentic study planner that personalizes course roadmaps based on student backgrounds, career interests, and strict FTMM academic constraints.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                   FTMM COMPASS 3-TIER GATEWAY ARCHITECTURE                     │
└────────────────────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                     Tier 1: Modular Frontend (React 19)                      │
 │                                                                              │
 │   ┌───────────────┐   ┌────────────────┐   ┌─────────────────────────────┐   │
 │   │   Dashboard   │   │  CourseFinder  │   │        DegreePlanner        │   │
 │   │ (Stats & Grid)│   │(Detail/Modal/  │   │ (PlannerHeader, SemColumn,  │   │
 │   └───────────────┘   │ PrereqDiagram) │   │  PickerModal, ElectiveBank) │   │
 │                       └────────────────┘   └──────────────▲──────────────┘   │
 │                                                           │                  │
 │                                      [Apply AI Plan] ─────┘                  │
 │                                                           │                  │
 │                                            ┌──────────────┴──────────────┐   │
 │                                            │      Compass AI Chatbot     │   │
 │                                            │ (SSE Stream & Action Cards) │   │
 │                                            └──────────────▲──────────────┘   │
 └───────────────────────────────────────────────────────────┼──────────────────┘
                                                             │
                               Vite Dynamic Proxy (/api/v1/* & /api/* via .backend-port)
                                                             │
 ┌───────────────────────────────────────────────────────────▼──────────────────┐
 │                     Tier 2: Backend Gateway Service (FastAPI)                │
 │                                                                              │
 │   ┌──────────────────────────────────────────────────────────────────────┐   │
 │   │      Dual-Router Gateway (/api/v1 & /api) + Resilient Fallback       │   │
 │   │       (Probes Microservice; Falls Back to Local Tools if Offline)    │   │
 │   └───────────────────────┬──────────────────────────────┬───────────────┘   │
 │                           │                              │                   │
 │        [HTTP / SSE Forward /api/v1/chat]       [Local Deterministic Engine]  │
 │                           │                              │                   │
 │                           ▼                              ▼                   │
 │ ┌──────────────────────────────────┐   ┌───────────────────────────────────┐ │
 │ │ Tier 3: AI Microservice (Docker) │   │     Deterministic Tools Layer     │ │
 │ │ • Repo: ftmm-compass-chatbot     │   │ • Prerequisite DAG Validator      │ │
 │ │ • Port: 8000 (Hybrid RAG-CAG)    │   │ • Semester Parity Validator       │ │
 │ │ • Ollama: qwen2.5:3b (Port 11434)│   │ • 5-Prodi FTMM Curriculum Loader  │ │
 │ │ • FAISS Cosine Vector Retriever  │   │ • 8-Semester Plan Synthesizer     │ │
 │ └──────────────────────────────────┘   └───────────────────────────────────┘ │
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

### Backend & AI Services
- **Python 3.10+** (managed via **[Astral UV](https://docs.astral.sh/uv/)**)
- **FastAPI Gateway** + **Uvicorn** (RESTful API, dynamic port auto-discovery 8000–8050, & CORS)
- **HTTPX** (Asynchronous client with timeout & resilient local fallback)
- **Pydantic v2** (Strict data validation schemas & DegreePlanPayload contracts)
- **AI Microservice (Docker)**: Hybrid RAG-CAG engine (`ftmm-compass-chatbot` on Port 8000)
- **Local LLM & Embeddings**: Ollama (`qwen2.5:3b`, `nomic-embed-text` on Port 11434)

## Cara Menjalankan Project

### 1. Prasyarat & Instalasi Tools

Sebelum memulai, pastikan perangkat Anda telah terpasang:

1. **Node.js (v22 LTS)**:
   - Unduh dari situs resmi [nodejs.org](https://nodejs.org/) (pilih versi 22 LTS), atau pasang lewat version manager seperti `nvm` / `fnm`.
   - Verifikasi: `node -v` (harus `v22.x.x`).

2. **pnpm (Package Manager Frontend)**:
   - Melalui Corepack (bawaan Node.js):
     ```bash
     corepack enable pnpm
     ```
   - Atau via npm global:
     ```bash
     npm install -g pnpm
     ```
   - Verifikasi: `pnpm -v`.

3. **Python (v3.10+) & Astral UV (Package Manager Backend)**:
   - **Python:** Unduh dari [python.org](https://www.python.org/) atau via package manager bawaan OS.
   - **Astral UV** (pengelola virtual environment & paket Python super cepat):
     - *Linux & macOS:*
       ```bash
       curl -LsSf https://astral.sh/uv/install.sh | sh
       ```
     - *Windows (PowerShell):*
       ```powershell
       powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
       ```
     - *Atau via pip / winget:*
       ```bash
       pip install uv
       # atau di Windows:
       winget install astral-sh.uv
       ```
     - Verifikasi: `uv --version`.

4. **Ollama (Opsional — untuk LLM Lokal)**:
   - Unduh installer dari [ollama.com](https://ollama.com).
   - Model rekomendasi: `ollama run qwen2.5:3b-instruct` (ringan, ~2 GB) atau `ollama run qwen2.5:7b-instruct`.
   - *(Jika Ollama tidak aktif, backend otomatis menggunakan fallback slot-filling deterministik sehingga aplikasi tetap berjalan lancar).*

5. **AI Chatbot Microservice (Opsional — untuk Inferensi Hybrid RAG-CAG Penuh)**:
   - Microservice AI berjalan di repositori sibling `ftmm-compass-chatbot`:
     ```bash
     cd ../ftmm-compass-chatbot
     # Ingest index kurikulum FAISS (hanya sekali di awal)
     uv run python scripts/ingest_faiss.py
     # Jalankan kontainer Docker
     docker compose up -d
     ```
   - Microservice akan aktif di `http://localhost:8000` dan terhubung langsung ke Ollama host.
   - *(Jika kontainer Docker tidak diaktifkan, Backend Gateway otomatis beralih ke agen slot-filling lokal sehingga seluruh fitur aplikasi tetap 100% berfungsi tanpa kendala).*
---

### 2. Menjalankan Sekaligus (Frontend + Backend — Rekomendasi)

Jalankan perintah berikut untuk mengaktifkan frontend dan backend secara bersamaan lintas OS (Linux, macOS, Windows):

```bash
# 1. Install dependencies frontend
pnpm install

# 2. Sinkronisasi dependencies backend (otomatis membuat venv via uv)
uv sync --directory backend

# 3. Jalankan frontend + backend bersamaan
pnpm dev:all
```

- **Cross-Platform**: Menggunakan `concurrently` yang mendukung signal terminate (Ctrl+C) bersih di Linux maupun Windows.
- **Dynamic Port Auto-Discovery**: Backend otomatis memindai port kosong (mulai dari 8000 $\rightarrow$ 8001, dst. jika port 8000 sedang dipakai proses lain). Vite dev proxy secara dinamis membaca port aktif dan meneruskan request `/api`.
- Buka **`http://localhost:8443`** di browser. Login dengan NIM dan password apa saja (simulasi autentikasi).

---

### 3. Menjalankan Terpisah (2 Tab Terminal)

Jika Anda lebih menyukai tab terminal terpisah untuk memantau log masing-masing service:

- **Terminal 1 — Backend FastAPI**:
  ```bash
  pnpm dev:backend
  # atau manual:
  uv run --directory backend python app.py
  ```
  Backend aktif di `http://localhost:<PORT>` (Swagger interactive docs di `/docs`).

- **Terminal 2 — Frontend Vite**:
  ```bash
  pnpm dev
  ```
  Vite aktif di `http://localhost:8443`.

*(Opsional)* Jalankan model LLM lokal di terminal terpisah:
```bash
ollama run qwen2.5:3b-instruct
# atau model lebih besar:
ollama run qwen2.5:7b-instruct
```


---

### 4. Menjalankan via Docker Compose (Multi-Container `ftmm-network`)

Untuk deployment terisolasi berbasis kontainer atau setup di server/VPS baru:

#### A. Inisialisasi Jaringan Host (Hanya 1x di Server/Host Baru)
```bash
# 1. Buat bridge network bersama untuk komunikasi inter-kontainer
docker network create ftmm-network 2>/dev/null || true

# 2. Jika Ollama berjalan di host dengan firewall UFW aktif (misal Ubuntu/WSL2):
sudo ufw allow 11434/tcp
```

#### B. Menjalankan Layanan Kontainer
```bash
# 1. Jalankan Chatbot Microservice (port 8000)
cd ../ftmm-compass-chatbot && docker compose up -d

# 2. Jalankan Gateway (port 8001) dan Frontend UI (port 8443)
cd ../ftmm-compass-ui && docker compose up -d
```

#### C. Verifikasi Konektivitas
- **Frontend Web UI**: `http://localhost:8443`
- **Gateway Health**: `curl -s http://localhost:8001/api/v1/health | jq .` (memverifikasi status `chatbot_service_online: true` dan `ollama_online: true`).
- **Chatbot Direct Health**: `curl -s http://localhost:8000/api/v1/health | jq .`
- **Hentikan Seluruh Layanan**:
  ```bash
  docker compose down && docker compose -f ../ftmm-compass-chatbot/docker-compose.yml down
  ```
---

## Testing & QA Audit

Proyek ini dilengkapi rangkaian pengujian otomatis untuk memvalidasi fungsi backend dan integritas tipe frontend:

```bash
# 1. Jalankan unit test logic planner, validator, dan slot-filling agent
uv run --directory backend python test_backend.py

# 2. Jalankan integration test endpoint FastAPI
uv run --directory backend python test_api_endpoints.py

# 3. Jalankan build test & type check frontend
pnpm build

# 4. Verifikasi format code (oxfmt)
pnpm format:check
# atau auto-format in-place:
pnpm format
```

---

## Struktur Direktori

```
ftmm-compass-ui/
├── .github/workflows/ci.yml       # Automated CI pipeline (Node 22 + Python 3.11)
├── AI_PLANNER_PIPELINE.md         # Dokumentasi detail arsitektur Study Planner Agent
├── DESIGN.md                      # Spesifikasi sistem desain & token visual FTMM
├── Dockerfile.frontend            # Container image definition untuk React + Vite
├── Dockerfile.backend             # Multi-stage container image untuk FastAPI (uv)
├── docker-compose.yml             # Orkestrasi multi-container (ftmm-network)
├── backend/                       # Python FastAPI Backend Gateway
│   ├── README.md                  # Dokumentasi API, setup uv, & arsitektur backend
│   ├── app.py                     # Dual-tier API gateway (/api/v1/* & /api/*)
│   ├── schemas.py                 # Pydantic v2 data models & payload contracts
│   ├── data_loader.py             # Fallback katalog resmi 5 Prodi FTMM & PRODI_ALIASES
│   ├── pyproject.toml             # Konfigurasi dependensi uv (Astral)
│   ├── uv.lock                    # Deterministic lockfile backend
│   ├── requirements.txt           # Export dependensi pip standar
│   ├── .env.example               # Template konfigurasi environment backend
│   ├── tools/
│   │   ├── prerequisite_validator.py  # Deterministic DAG, parity, & SKS validator
│   │   └── planner.py             # Study plan synthesis & elective scoring engine
│   ├── test_backend.py            # Unit tests untuk 5 prodi loader, validator, & planner
│   └── test_api_endpoints.py      # Integration tests untuk seluruh rute FastAPI
├── src/                           # React 19 + TypeScript + Tailwind v4 SPA
│   ├── App.tsx                    # Top-level state hub & planner payload wiring
│   ├── main.tsx                   # React DOM entrypoint
│   ├── data.ts                    # Core TypeScript models, TIMETABLE_DAYS, & SCHEDULE
│   ├── courseData.ts              # Reactive catalog fetcher (fetchCatalog) & normalizer
│   ├── index.css                  # Tailwind v4 @theme design tokens (Navy, Gold, Teal)
│   ├── utils.ts                   # cn() class merger helper
│   ├── pages/
│   │   ├── Login.tsx              # Simulated Cybercampus SSO authentication page
│   │   ├── Dashboard.tsx          # Academic stats & weekly timetable widget
│   │   ├── CourseFinder.tsx       # Course catalog explorer & filter
│   │   ├── DegreePlanner.tsx      # Interactive 8-semester drag-and-drop roadmap
│   │   └── Chatbot.tsx            # Compass AI conversational planner (SSE + Fallback)
│   └── components/
│       ├── TimetableGrid.tsx      # Shared weekly timetable grid & conflict detector
│       ├── MarkdownRenderer.tsx   # GFM markdown renderer for chat messages
│       ├── course-finder/
│       │   ├── CourseDetailView.tsx     # Full course syllabus & workload view
│       │   ├── CourseQuickModal.tsx     # Quick preview modal
│       │   └── PrerequisiteDiagram.tsx  # SVG DAG prerequisite flow visualizer
│       ├── degree-planner/
│       │   ├── PlannerHeader.tsx        # AI banner, legend, & drag hints
│       │   ├── SemesterColumn.tsx       # Semester drop column, CourseCard, & ElectiveBank
│       │   ├── CoursePickerModal.tsx    # Manual course addition modal
│       │   └── types.ts                 # Planner types & parity/lock rules (canDrop)
│       └── chatbot/
│           ├── DegreePlanActionCard.tsx # Interactive card to apply AI plan to planner
│           └── chatService.ts           # Chat types, endpoints, & error sanitizer
├── database/                      # Canonical Database Baseline V2.1 RC1
│   ├── schema_v2_1_rc1.sql        # PostgreSQL 16+ DDL (36 tables, 26 functions, 44 triggers)
│   ├── schema_v2_1_rc1.dbml       # DBML diagram definition
│   └── README.md                  # Ringkasan paket skema database
├── docs/database/                 # Dokumentasi & Audit Skema Database V2.1 RC1
│   ├── DATABASE_SCHEMA_V2_1_RC1.md    # Spesifikasi arsitektur 36 tabel & rule tree
│   ├── SCHEMA_VALIDATION_V2_1_RC1.md  # Laporan 97/97 static release audit checks
│   └── CHANGELOG_V2_TO_V2_1_RC1.md    # Catatan migrasi dari v2 ke v2.1 RC1
├── RANCANGAN DIAGRAM AWAL.sql     # Arsip baseline awal PostgreSQL 16 (v2)
└── SCHEMA_REVIEW.md               # Arsip catatan tinjauan skema v2
```

---

## Database Baseline — V2.1 RC1

`database/schema_v2_1_rc1.sql` adalah canonical baseline PostgreSQL 16+ untuk arsitektur basis data akademik FTMM (**36 tabel, 26 fungsi PL/pgSQL, 44 trigger, 2 read views**, dan lulus **97/97 static audit checks**). Dokumentasi lengkap keputusan desain tersedia di [`docs/database/DATABASE_SCHEMA_V2_1_RC1.md`](./docs/database/DATABASE_SCHEMA_V2_1_RC1.md) dan laporan validasinya di [`docs/database/SCHEMA_VALIDATION_V2_1_RC1.md`](./docs/database/SCHEMA_VALIDATION_V2_1_RC1.md).
