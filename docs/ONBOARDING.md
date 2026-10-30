# FTMM Compass — Developer Onboarding & Local Setup Guide

Selamat datang di tim pengembang **FTMM Compass**! Dokumen ini dirancang untuk memandu pengembang baru melakukan *onboarding* dan *local environment setup* dalam waktu kurang dari 5 menit menggunakan antarmuka otomasi `Makefile`.

---

## 1. Prasyarat Sistem & Toolchain

Sebelum memulai, pastikan mesin pengembang (Linux, macOS, atau Windows WSL2) telah terpasang *toolchain* berikut:

| Tool | Versi Minimum | Panduan Instalasi Singkat |
|---|---|---|
| **Git** | Versi terbaru | `sudo apt install git` / `brew install git` |
| **Node.js** | `>= 22.x` (LTS direkomendasikan) | via [fnm](https://github.com/Schniz/fnm) atau [mise](https://mise.jdx.dev) |
| **pnpm** | `>= 9.x` | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Python** | `>= 3.12` | `sudo apt install python3 python3-venv` / via `mise` |
| **Astral uv** | Versi terbaru | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Docker Engine & Compose** | Docker v24+ / Compose v2+ | [Docker Installation Guide](https://docs.docker.com/engine/install/) |
| **Make** | Standar POSIX | `sudo apt install make` / `xcode-select --install` |

> **Tips Cepat:** Kamu bisa memverifikasi seluruh kesiapan toolchain di atas dalam 1 detik dengan menjalankan:
> ```bash
> make doctor
> ```

---

## 2. Quick Start: Setup Proyek dalam 1 Perintah

Lakukan kloning repositori dan jalankan perintah automasi `setup`:

```bash
# 1. Kloning repositori (gunakan fork personal kamu)
git clone git@github.com:Primarizki21/ftmm-compass-ui.git
cd ftmm-compass-ui

# 2. Jalankan automasi onboarding penuh
make setup
```

### Apa yang Dilakukan oleh `make setup`?
Secara otomatis dan berurutan:
1. **System Diagnostics**: Memverifikasi keberadaan Node, pnpm, Python, uv, dan Docker.
2. **Environment Initialization**: Menyalin berkas template `.env.example` $\rightarrow$ `.env` dan `backend/.env.example` $\rightarrow$ `backend/.env` (tanpa menimpa berkas yang sudah ada).
3. **Network Initialization**: Memastikan bridge network `ftmm-network` dibuat di Docker Engine.
4. **Dependencies Installation**: Memasang paket frontend via `pnpm install` dan sinkronisasi virtualenv backend via `uv sync`.
5. **Database Provisioning**: Menyalakan container PostgreSQL 16 (`docker compose up -d postgres`) dan menunggu hingga siap menerima koneksi (`pg_isready`).
6. **Schema Migration**: Menjalankan migrasi basis data Alembic ke versi terbaru (36 tabel canonical skema v2.1 RC1).
7. **Database Seeding**: Mengisi data awal akun pengujian (*student*, *lecturer*, *admin*) serta katalog kurikulum resmi.

---

## 3. Menjalankan Server Pengembangan

Setelah `make setup` selesai, kamu dapat langsung menyalakan aplikasi:

```bash
make dev
```

Perintah di atas akan menjalankan frontend Vite (port `8443`) dan backend FastAPI Gateway (auto-detect port bebas `8001–8050`) secara bersamaan (*concurrently*) dalam satu jendela terminal.

Akses aplikasi melalui browser:
- **Frontend Web UI**: [http://localhost:8443](http://localhost:8443)
- **Backend API Docs (Swagger UI)**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **API Health Check**: [http://localhost:8001/api/health](http://localhost:8001/api/health)

---

## 4. Dua Mode Menjalankan Aplikasi: Hybrid vs Full Docker

Terdapat dua cara untuk menjalankan aplikasi FTMM Compass:

### Mode 1: Hybrid Mode (Sangat Direkomendasikan untuk Daily Coding)
- **Database**: Berjalan di Docker (`make db-up`).
- **Frontend & Backend**: Berjalan langsung di host OS (`make dev`).
- **Keuntungan**:
  - Hot Module Replacement (Vite HMR) instan (<50 ms).
  - Sangat hemat RAM (<300 MB).
  - Autocomplete TypeScript & Python di IDE (VSCode / Cursor) langsung bekerja out-of-the-box.

### Mode 2: Full Docker Mode (Untuk QA, Reviewer, atau CI/CD)
Jika kamu ingin menjalankan seluruh stack (PostgreSQL, Gateway, dan Frontend) di dalam container tanpa menyentuh runtime host:

```bash
# Menyalakan seluruh stack container
make docker-up

# Menghentikan seluruh stack container
make docker-down
```

---

## 5. Ringkasan Perintah CLI (`Makefile`)

Jalankan `make help` untuk melihat seluruh perintah:

```text
FTMM Compass — Developer Automation Interface
Gunakan: make [target]

  help               Menampilkan panduan seluruh perintah yang tersedia
  doctor             Memeriksa kesiapan toolchain di host machine (Node, pnpm, Python, uv, Docker)
  env-init           Menginisialisasi berkas .env dari template example jika belum ada
  network-init       Memastikan docker network ftmm-network tersedia
  db-up              Menyalakan container PostgreSQL di latar belakang
  db-wait            Menunggu PostgreSQL siap menerima koneksi
  db-down            Menghentikan container PostgreSQL
  db-reset           Mereset database PostgreSQL (hapus volume, recreate, migrate, seed)
  install            Memasang dependensi frontend (pnpm) dan backend (uv)
  migrate            Menjalankan migrasi skema database Alembic ke head
  seed               Mengisi database dengan data awal pengguna dan kurikulum
  setup              Alur otomatis satu perintah untuk developer baru
  dev                Menjalankan frontend dan backend secara bersamaan di host native
  dev-frontend       Hanya menjalankan server frontend Vite
  dev-backend        Hanya menjalankan server backend FastAPI
  test               Menjalankan seluruh pengujian (typecheck, backend API, frontend smoke test)
  lint               Menjalankan pemeriksaan format kode dan typecheck
  format             Memformat seluruh kode menggunakan oxfmt
  docker-up          Menjalankan seluruh stack aplikasi di dalam Docker container
  docker-down        Menghentikan seluruh stack Docker container
  clean              Membersihkan artefak build sementara dan cache
```

---

## 6. Pengujian & Kualitas Kode

Sebelum membuat commit atau membuka Pull Request, jalankan rangkaian pengujian dan formatter:

```bash
# Menjalankan seluruh test suite (Typecheck, Backend API, Frontend Smoke)
make test

# Format kode otomatis menggunakan oxfmt
make format

# Periksa linting dan typing
make lint
```

---

## 7. Troubleshooting Playbook

### Q1: Error `port is already allocated` pada port 5432 saat `make db-up`
**Penyebab:** Ada service PostgreSQL lokal atau container Docker lain yang sedang berjalan di port 5432 host.  
**Solusi:**
1. Cek container yang menggunakan port 5432:
   ```bash
   docker ps | grep 5432
   ```
2. Hentikan container lain tersebut jika tidak dipakai, atau ubah mapping port di `docker-compose.yml` / `.env` (misal ke `5433:5432`).

### Q2: Database kosong / butuh reset ke kondisi bersih awal
**Solusi:**
Jalankan perintah reset satu baris:
```bash
make db-reset
```
Perintah ini akan menghapus volume database lama, menyalakan kembali PostgreSQL, menjalankan migrasi Alembic dari awal, dan mengisikan data seeder baru.

### Q3: Error `network ftmm-network not found`
**Solusi:**
Jalankan inisialisasi jaringan:
```bash
make network-init
```

---

## 8. Standar Git & Branching

Sesuai panduan tata kelola repositori di `AGENTS.md`:
1. **DILARANG KERAS bekerja atau melakukan commit langsung di branch `main`**.
2. Selalu buat feature branch dari `upstream/main` terbaru:
   ```bash
   git checkout -b feat/<nama-fitur>   # atau fix/<nama-bug>
   ```
3. Jangan pernah menjalankan `git push` via automated tool atau agent; push ke remote adalah hak prerogatif developer secara manual.
