# Low-Level Implementation Plan: Developer Setup & DX Optimization via Makefile

**Document ID:** `PLAN-DX-20261030`  
**Branch:** `feat/setup-dx-makefile`  
**Status:** Under Review (Proposal & Plan Only)  
**Target Subsystems:** Developer Tooling, Local Orchestration, Containerization, Onboarding Documentation  

---

## 1. Konteks Masalah & Evaluasi Kebutuhan Onboarding

Repositori `ftmm-compass-ui` adalah aplikasi *polyglot* berskala institusional yang menggabungkan:
1. **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 SPA (Node 22 + `pnpm`).
2. **Backend**: FastAPI Gateway + SQLAlchemy + AsyncPG + Alembic (Python >= 3.12 + `uv`).
3. **Database**: PostgreSQL 16 dengan 36 tabel, 26 fungsi PL/pgSQL, dan 44 trigger (Docker Compose).
4. **Integrasi Eksternal**: Microservice Chatbot (`ftmm-compass-chatbot`) via network bridge atau Cloudflare Tunnel.

### Friction Points Developer Baru Saat Ini:
- **Tingginya Ketergantungan Pengetahuan Implisit**: Developer baru harus mengetahui urutan instalasi manual yang rumit: salin berkas `.env`, pasang dependensi Node via `pnpm`, buat virtual environment Python via `uv`, nyalakan PostgreSQL Docker, jalankan migrasi Alembic, jalankan script *seed*, baru kemudian menjalankan server dev.
- **Potensi Kesalahan Konfigurasi Jaringan Docker**: Berkas `docker-compose.yml` mendeklarasikan jaringan eksternal `ftmm-network`. Jika developer baru belum pernah membuat jaringan tersebut, perintah Docker Compose akan gagal dengan pesan error fatal `network ftmm-network declared as external, but could not be found`.
- **Divergensi Perintah Antar Platform**: Developer yang bekerja di Ubuntu native, WSL2, atau macOS sering kali menggunakan sintaks berbeda untuk eksekusi sub-task.

---

## 2. Analisis Perbandingan: Docker Penuh vs Host Native (`pnpm` + `uv`)

Salah satu pertanyaan mendasar developer adalah: *Apakah lebih baik menjalankan frontend & backend di dalam Docker, atau langsung di host menggunakan `pnpm` dan `uv`?*

Berikut adalah analisis komparasi teknis:

| Dimensi Evaluasi | Full Docker Compose (`docker compose up`) | Host Native (`pnpm dev:all` + `uv`) | Rekomendasi Arsitektur (The Sweet Spot) |
|---|---|---|---|
| **Kebutuhan Setup Host** | **Nol Runtime**. Cukup install Docker Engine / Docker Desktop. Tidak butuh Node.js, Python, atau `uv` di host. | **Perlu Runtime**. Host wajib terpasang Node 22, pnpm, Python >= 3.12, dan uv. | **Hybrid**: Host dipasang runtime modern (`uv` & `pnpm` sangat cepat diinstal dalam <2 menit). |
| **Kecepatan Hot Reloading (HMR / DX)** | **Lambat / Ada Latensi (1-3 detik)**. File watching melewati virtualization boundary (WSL2 9p/virtiofs atau Docker Desktop FUSE). Membutuhkan konfigurasi polling CPU-intensive. | **Instan (<50 ms)**. Vite HMR dan Uvicorn reload langsung menerima native OS `inotify` kernel events. Feedback perubahan kode seketika. | **Pemenang: Host Native**. Untuk daily development UI/API, HMR instan adalah faktor krusial produktivitas. |
| **Konsumsi Resource (RAM / CPU)** | **Berat (2–4 GB+ RAM)**. Membutuhkan virtual machine Docker, isolasi container, dan alokasi memory overhead. | **Sangat Ringan (<300 MB RAM)**. Vite dev server (~100 MB) + Uvicorn (~80 MB) berjalan hemat tanpa virtualization layer. | **Pemenang: Host Native**. Menghemat baterai laptop dan resource komputasi pengembang. |
| **Integrasi IDE & Tooling (LSP / Debugger)** | **Kompleks**. Memerlukan ekstensi VSCode Dev Containers. TypeScript LSP dan Python Pyright/Ruff di host tidak dapat langsung membaca dependensi container tanpa mount volume khusus. | **Seamless & Out-of-the-Box**. VSCode / Cursor langsung membaca `node_modules` dan `backend/.venv`. Autocomplete, linting oxfmt, jump to definition, dan breakpoint aktif langsung. | **Pemenang: Host Native**. Debugging dan auto-complete bekerja tanpa konfigurasi container tambahan. |
| **Dynamic Port Binding** | **Statis**. Port dipatok kaku (misal 8001 dan 8443) melalui port forwarding Docker. | **Dinamis & Adaptif**. Backend memiliki algoritma auto-detect free port (8001–8050) dan menulis ke `.backend-port` yang dibaca Vite. | **Pemenang: Host Native**. Mencegah error *Port Already in Use* jika developer membuka sesi paralel. |
| **Paritas Produksi (Parity)** | **Sangat Tinggi**. Menjamin environment 100% identik dengan server target produksi. | **Cukup Tinggi**. Bergantung pada pinned tool versions (`.mise.toml`, `package.json`, `uv.lock`). | **Docker** unggul untuk staging/production build verification. |

### Kesimpulan Rekomendasi (Hybrid Workflow):
1. **Untuk Daily Development (Frontend & Backend Engineers)**:
   - **Database di Docker**: PostgreSQL dijalankan via container (`docker compose up -d postgres`) agar engine database terisolasi dan tidak mengotori host OS.
   - **Frontend & Backend di Host Native**: Dijalankan via `pnpm dev:all` (Vite + FastAPI via `uv`) untuk menikmati HMR super cepat, resource hemat, dan integrasi IDE yang sempurna.
2. **Untuk Reviewer / Non-Developer / QA / CI-CD**:
   - Gunakan **Full Docker Compose** (`docker compose up --build`) jika mereka hanya ingin melihat aplikasi berjalan tanpa perlu mengedit kode atau memasang environment Node/Python.

---

## 3. Desain Solusi: Single Entrypoint CLI via Makefile

Menggunakan `Makefile` adalah pola standar industri untuk proyek polyglot karena:
1. `make` tersedia secara *native* di Linux, macOS, dan Windows (via WSL2 / Git Bash).
2. Menyediakan abstraksi deklaratif yang menyembunyikan flag panjang, urutan dependensi, dan perintah multi-bahasa (`pnpm`, `uv`, `docker compose`, `alembic`).
3. Memungkinkan automasi pengecekan sistem awal (*system pre-flight doctor*) untuk mendeteksi *missing tools* sebelum developer mengalami kegagalan kompilasi.

### Diagram Alur Setup Developer Baru (`make setup`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer Baru
    participant Make as Makefile Engine
    participant Host as Host Runtime Check
    participant Env as Environment Handler
    participant Net as Docker Network Bridge
    participant DB as PostgreSQL (Docker)
    participant Dep as Package Managers (pnpm & uv)
    participant Mig as Alembic & Database Seeder

    Dev->>Make: make setup
    Make->>Host: Pre-flight check (Node, pnpm, Python, uv, Docker)
    Host-->>Make: OK / Warning jika versi tidak sesuai
    Make->>Env: Salin .env.example -> .env & backend/.env.example -> backend/.env
    Env-->>Make: Environment files ready
    Make->>Net: Pastikan ftmm-network exists (docker network create)
    Net-->>Make: Network confirmed
    Make->>DB: docker compose up -d postgres
    DB-->>Make: Container started
    Make->>DB: Loop probe: pg_isready (maks 30 detik)
    DB-->>Make: Database healthy & accepting connections
    Make->>Dep: pnpm install && uv sync --directory backend
    Dep-->>Make: Dependencies locked & installed
    Make->>Mig: uv run alembic upgrade head
    Mig-->>Make: Schema v2.1 RC1 applied (36 tables)
    Make->>Mig: uv run python seed.py
    Mig-->>Make: Initial users & curriculum data seeded
    Make-->>Dev: [SUCCESS] Project ready! Run 'make dev' to start.
```

---

## 4. Rincian Teknis Implementasi (Low-Level Changes)

### 4.1. Berkas Baru: `Makefile` (Root Workspace)
Target-target kanonik yang akan didefinisikan:

```makefile
# Variables
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Colors for terminal output (Zero-Emoji Policy compliant)
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
RESET   := \033[0m

.PHONY: help doctor setup env-init network-init install db-up db-down db-wait db-reset migrate seed dev dev-frontend dev-backend test lint format docker-up docker-down clean

help: ## Menampilkan panduan seluruh perintah yang tersedia
	@echo -e "$(CYAN)FTMM Compass — Developer Automation Interface$(RESET)"
	@echo -e "Gunakan: make [target]\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'

doctor: ## Memeriksa kesiapan toolchain di host machine (Node, pnpm, Python, uv, Docker)
	@echo -e "$(CYAN)[CHECK] Menjalankan pre-flight system diagnostics...$(RESET)"
	@which node > /dev/null 2>&1 && echo -e "  [OK] Node.js: $$(node -v)" || echo -e "  $(RED)[FAIL] Node.js belum terpasang (Wajib >= 22)$(RESET)"
	@which pnpm > /dev/null 2>&1 && echo -e "  [OK] pnpm: $$(pnpm -v)" || echo -e "  $(RED)[FAIL] pnpm belum terpasang$(RESET)"
	@which python3 > /dev/null 2>&1 && echo -e "  [OK] Python: $$(python3 --version)" || echo -e "  $(RED)[FAIL] Python3 belum terpasang (Wajib >= 3.12)$(RESET)"
	@which uv > /dev/null 2>&1 && echo -e "  [OK] uv: $$(uv --version)" || echo -e "  $(RED)[FAIL] Astral uv belum terpasang$(RESET)"
	@which docker > /dev/null 2>&1 && echo -e "  [OK] Docker: $$(docker --version)" || echo -e "  $(RED)[FAIL] Docker belum terpasang$(RESET)"

env-init: ## Menginisialisasi berkas .env dari template example jika belum ada
	@if [ ! -f .env ]; then cp .env.example .env && echo -e "[INFO] Berkas .env berhasil dibuat dari .env.example"; else echo -e "[INFO] Berkas .env sudah ada, melewati salinan"; fi
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env && echo -e "[INFO] Berkas backend/.env berhasil dibuat dari backend/.env.example"; else echo -e "[INFO] Berkas backend/.env sudah ada, melewati salinan"; fi

network-init: ## Memastikan docker network ftmm-network tersedia
	@docker network inspect ftmm-network > /dev/null 2>&1 || (docker network create ftmm-network && echo -e "[INFO] Jaringan Docker ftmm-network berhasil dibuat")

db-up: network-init ## Menyalakan container PostgreSQL di latar belakang
	@echo -e "$(CYAN)[DOCKER] Menyalakan PostgreSQL database...$(RESET)"
	@docker compose up -d postgres

db-wait: ## Menunggu PostgreSQL siap menerima koneksi
	@echo -e "$(CYAN)[HEALTH] Menunggu database siap...$(RESET)"
	@until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo -e "$(GREEN)[OK] PostgreSQL siap menerima koneksi.$(RESET)"

db-down: ## Menghentikan container PostgreSQL
	@docker compose stop postgres

db-reset: ## Menghapus seluruh volume database dan menyalakan kembali dari awal
	@echo -e "$(YELLOW)[WARN] Mereset volume database PostgreSQL...$(RESET)"
	@docker compose down -v
	@$(MAKE) db-up
	@$(MAKE) db-wait
	@$(MAKE) migrate
	@$(MAKE) seed

install: ## Menginstal dependensi frontend (pnpm) dan backend (uv)
	@echo -e "$(CYAN)[INSTALL] Memasang dependensi Node.js...$(RESET)"
	@pnpm install
	@echo -e "$(CYAN)[INSTALL] Memasang dependensi Python venv via uv...$(RESET)"
	@uv sync --directory backend

migrate: ## Menjalankan migrasi skema database Alembic ke head
	@echo -e "$(CYAN)[ALEMBIC] Menjalankan migrasi database...$(RESET)"
	@uv run --directory backend alembic upgrade head

seed: ## Mengisi database dengan data awal pengguna dan kurikulum
	@echo -e "$(CYAN)[SEED] Mengisi data awal ke database...$(RESET)"
	@uv run --directory backend python seed.py

setup: doctor env-init network-init install db-up db-wait migrate seed ## Alur lengkap satu kali eksekusi untuk developer baru
	@echo -e "\n$(GREEN)=====================================================$(RESET)"
	@echo -e "$(GREEN)[SUCCESS] Setup proyek FTMM Compass selesai!$(RESET)"
	@echo -e "Jalankan perintah berikut untuk memulai server pengembangan:"
	@echo -e "  $(CYAN)make dev$(RESET)"
	@echo -e "$(GREEN)=====================================================$(RESET)\n"

dev: ## Menjalankan server frontend dan backend secara bersamaan di host native
	@pnpm dev:all

dev-frontend: ## Hanya menjalankan frontend Vite
	@pnpm dev

dev-backend: ## Hanya menjalankan backend FastAPI
	@pnpm dev:backend

test: ## Menjalankan seluruh pengujian (typecheck, backend API, frontend smoke test)
	@echo -e "$(CYAN)[TEST] Typecheck frontend...$(RESET)"
	@pnpm typecheck
	@echo -e "$(CYAN)[TEST] Pengujian backend endpoints...$(RESET)"
	@uv run --directory backend python test_api_endpoints.py
	@echo -e "$(CYAN)[TEST] Frontend smoke verification...$(RESET)"
	@python3 scripts/verify_frontend.py

format: ## Menjalankan formatting kode dengan oxfmt
	@pnpm format

lint: ## Menjalankan pemeriksaan format dan TypeScript lint
	@pnpm format:check
	@pnpm typecheck

docker-up: network-init ## Menjalankan seluruh stack aplikasi di dalam Docker container
	@docker compose up --build

docker-down: ## Menghentikan seluruh stack Docker container
	@docker compose down

clean: ## Membersihkan artefak build sementara dan cache
	@rm -rf dist .vite backend/.pytest_cache backend/__pycache__
	@find backend -type d -name "__pycache__" -exec rm -rf {} +
	@echo -e "[INFO] Cache dan file build sementara dibersihkan."
```

### 4.2. Penyesuaian `backend/.env.example`
Menambahkan definisi variabel `DATABASE_URL` secara eksplisit agar developer baru tidak bingung mengenai format koneksi PostgreSQL:

```bash
# Tambahan pada baris 1-5:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ftmm_compass_dev
```

### 4.3. Penyesuaian `docker-compose.yml` (Resilience Guard)
Memastikan definisi `ftmm-network` dapat dijalankan secara toleran terhadap first-time run:
```yaml
networks:
  default:
  ftmm-network:
    name: ftmm-network
    external: true
```
Dengan automasi target `network-init` pada `Makefile`, pembuatan network akan di-handle secara otomatis sebelum container dijalankan.

### 4.4. Berkas Baru: `docs/ONBOARDING.md`
Dokumentasi onboarding ramah pemula yang merinci:
1. **Daftar Prasyarat Toolchain Minimal** (Node 22, pnpm, Python 3.12, Astral uv, Docker Engine).
2. **Panduan Quick-Start (1-Command Onboarding)**:
   ```bash
   git clone git@github.com:Primarizki21/ftmm-compass-ui.git
   cd ftmm-compass-ui
   make setup
   make dev
   ```
3. **Penyelesaian Masalah (Troubleshooting Playbook)**:
   - Port bentrok di host (bagaimana sistem otomatis mendeteksi port backend 8001–8050).
   - Docker daemon mati / koneksi postgres gagal.
   - Cara mereset database ke keadaan bersih (`make db-reset`).

---

## 5. Kriteria Verifikasi Terukur (Acceptance Criteria)

Sebelum implementasi dinyatakan selesai dan siap di-merge, serangkaian verifikasi berikut wajib dipenuhi:
1. **Pre-flight Diagnostic Check**:
   - Menjalankan `make doctor` pada terminal bersih dan memastikan seluruh toolchain terdeteksi dengan status `[OK]`.
2. **Fresh Onboarding Test (Clean Slate Simulation)**:
   - Menghapus file `.env` dan `backend/.env`.
   - Menghapus container & volume PostgreSQL lama (`docker compose down -v`).
   - Menjalankan `make setup` dari kondisi kosong (*clean state*).
   - Memastikan tidak ada langkah yang terhenti atau menghasilkan *unhandled exception*.
   - Memverifikasi 36 tabel skema v2.1 RC1 dan data seeding pengguna terbuat sempurna di database.
3. **Development Loop Validation**:
   - Menjalankan `make dev` dan memastikan Vite (port 8443) serta FastAPI Gateway (port 8001–8050) menyala tanpa error.
   - Melakukan uji HTTP pada `http://localhost:8443` dan `http://localhost:8001/api/health`.
4. **Test & Quality Gate**:
   - Menjalankan `make test` dan memastikan 100% test suite lulus (Typecheck PASS, Backend tests PASS, Frontend smoke PASS).
   - Menjalankan `make format` dan memastikan seluruh file terformat rapi sesuai standar `oxfmt`.
5. **Zero Dangling Files & Clean Tree**:
   - Memastikan `git status -s` bersih dan seluruh berkas ter-commit secara atomik pada branch `feat/setup-dx-makefile`.
