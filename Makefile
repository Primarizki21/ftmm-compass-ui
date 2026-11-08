# ==============================================================================
# FTMM COMPASS — Developer Automation Makefile
# Unified CLI for local development, database lifecycle, testing, and container orchestration.
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Terminal formatting colors (Zero-Emoji Policy compliant)
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
BOLD    := \033[1m
RESET   := \033[0m

.PHONY: help doctor setup env-init network-init install db-up db-down db-wait db-reset migrate seed dev dev-frontend dev-backend test lint format docker-up docker-down clean

help: ## Menampilkan panduan seluruh perintah yang tersedia
	@echo -e "$(BOLD)$(CYAN)FTMM Compass — Developer Automation Interface$(RESET)"
	@echo -e "Gunakan: make [target]\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'

doctor: ## Memeriksa kesiapan toolchain di host machine (Node, pnpm, Python, uv, Docker)
	@echo -e "$(CYAN)[CHECK] Menjalankan pre-flight system diagnostics...$(RESET)"
	@which node > /dev/null 2>&1 && echo -e "  [OK] Node.js: $$(node -v)" || echo -e "  $(RED)[FAIL] Node.js belum terpasang (Wajib >= 22)$(RESET)"
	@which pnpm > /dev/null 2>&1 && echo -e "  [OK] pnpm: $$(pnpm -v)" || echo -e "  $(RED)[FAIL] pnpm belum terpasang$(RESET)"
	@which python3 > /dev/null 2>&1 && echo -e "  [OK] Python: $$(python3 --version)" || echo -e "  $(RED)[FAIL] Python3 belum terpasang (Wajib >= 3.12)$(RESET)"
	@which uv > /dev/null 2>&1 && echo -e "  [OK] uv: $$(uv --version)" || echo -e "  $(RED)[FAIL] Astral uv belum terpasang$(RESET)"
	@which docker > /dev/null 2>&1 && echo -e "  [OK] Docker: $$(docker --version)" || echo -e "  $(RED)[FAIL] Docker belum terpasang$(RESET)"
	@docker compose version > /dev/null 2>&1 && echo -e "  [OK] Docker Compose: $$(docker compose version)" || echo -e "  $(RED)[FAIL] Docker Compose belum terpasang$(RESET)"

env-init: ## Menginisialisasi berkas .env dari template example jika belum ada
	@if [ ! -f .env ]; then \
		cp .env.example .env && echo -e "$(GREEN)[INFO] Berkas .env berhasil dibuat dari .env.example$(RESET)"; \
	else \
		echo -e "[INFO] Berkas .env sudah ada, melewati salinan"; \
	fi
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env && echo -e "$(GREEN)[INFO] Berkas backend/.env berhasil dibuat dari backend/.env.example$(RESET)"; \
	else \
		echo -e "[INFO] Berkas backend/.env sudah ada, melewati salinan"; \
	fi

network-init: ## Memastikan docker network ftmm-network tersedia
	@docker network inspect ftmm-network > /dev/null 2>&1 || (docker network create ftmm-network && echo -e "$(GREEN)[INFO] Jaringan Docker ftmm-network berhasil dibuat$(RESET)")

db-up: network-init ## Menyalakan container PostgreSQL di latar belakang
	@echo -e "$(CYAN)[DOCKER] Menyalakan PostgreSQL database...$(RESET)"
	@docker compose up -d postgres

db-wait: ## Menunggu PostgreSQL siap menerima koneksi
	@echo -e "$(CYAN)[HEALTH] Menunggu PostgreSQL menerima koneksi...$(RESET)"
	@counter=0; \
	until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do \
		counter=$$((counter + 1)); \
		if [ $$counter -ge 30 ]; then \
			echo -e "$(RED)[FAIL] Timeout menunggu PostgreSQL setelah 30 detik$(RESET)"; \
			exit 1; \
		fi; \
		sleep 1; \
	done
	@echo -e "$(GREEN)[OK] PostgreSQL siap menerima koneksi.$(RESET)"

db-down: ## Menghentikan container PostgreSQL
	@echo -e "$(CYAN)[DOCKER] Menghentikan container PostgreSQL...$(RESET)"
	@docker compose stop postgres

db-reset: ## Mereset database PostgreSQL (hapus volume, recreate, migrate, seed)
	@echo -e "$(YELLOW)[WARN] Mereset volume database PostgreSQL...$(RESET)"
	@docker compose down -v
	@$(MAKE) db-up
	@$(MAKE) db-wait
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo -e "$(GREEN)[OK] Database PostgreSQL berhasil di-reset ke kondisi awal.$(RESET)"

install: ## Memasang dependensi frontend (pnpm) dan backend (uv)
	@echo -e "$(CYAN)[INSTALL] Memasang dependensi frontend via pnpm...$(RESET)"
	@pnpm install
	@echo -e "$(CYAN)[INSTALL] Memasang dependensi backend via uv...$(RESET)"
	@uv sync --directory backend

migrate: ## Menjalankan migrasi skema database Alembic ke head
	@echo -e "$(CYAN)[ALEMBIC] Menjalankan migrasi database ke versi terbaru...$(RESET)"
	@uv run --directory backend alembic upgrade head

seed: ## Mengisi database dengan data pengguna, kurikulum, dan katalog 5 prodi
	@echo -e "$(CYAN)[SEED] Mengisi data awal ke database...$(RESET)"
	@uv run --directory backend python seed.py
	@echo -e "$(CYAN)[SEED] Mengisi katalog 5 prodi dari database/seed...$(RESET)"
	@uv run --directory backend python seed_full_catalog.py

setup: doctor env-init network-init install db-up db-wait migrate seed ## Alur otomatis satu perintah untuk developer baru
	@echo -e "\n$(GREEN)=====================================================$(RESET)"
	@echo -e "$(BOLD)$(GREEN)[SUCCESS] Setup proyek FTMM Compass selesai!$(RESET)"
	@echo -e "Jalankan perintah berikut untuk memulai server pengembangan:"
	@echo -e "  $(BOLD)$(CYAN)make dev$(RESET)"
	@echo -e "$(GREEN)=====================================================$(RESET)\n"

dev: ## Menjalankan frontend dan backend secara bersamaan di host native
	@pnpm dev:all

dev-frontend: ## Hanya menjalankan server frontend Vite
	@pnpm dev

dev-backend: ## Hanya menjalankan server backend FastAPI
	@pnpm dev:backend

test: ## Menjalankan seluruh pengujian (typecheck frontend + suite pytest backend)
	@echo -e "$(CYAN)[TEST] Typecheck TypeScript frontend...$(RESET)"
	@pnpm typecheck
	@echo -e "$(CYAN)[TEST] Suite backend (pytest)...$(RESET)"
	@uv run --directory backend python -m pytest tests -q

lint: ## Menjalankan pemeriksaan format kode dan typecheck
	@pnpm format:check
	@pnpm typecheck
	@uv run --directory backend ruff check .

format: ## Memformat seluruh kode menggunakan oxfmt
	@pnpm format

docker-up: network-init ## Menjalankan seluruh stack aplikasi di dalam Docker container
	@docker compose up --build

docker-down: ## Menghentikan seluruh stack Docker container
	@docker compose down

clean: ## Membersihkan artefak build sementara dan cache
	@rm -rf dist .vite backend/.pytest_cache
	@find backend -type d -name "__pycache__" -exec rm -rf {} +
	@echo -e "$(GREEN)[INFO] Cache dan file build sementara berhasil dibersihkan.$(RESET)"
