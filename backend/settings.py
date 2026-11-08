"""Konfigurasi runtime backend: satu-satunya tempat membaca environment."""

import os

from dotenv import load_dotenv

load_dotenv()  # environment shell menang atas berkas .env

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/ftmm_compass_dev",
)

# Port gateway; kosong/None berarti cari port bebas 8001-8050.
PORT_OVERRIDE = os.getenv("BACKEND_PORT") or os.getenv("PORT")
DEFAULT_BACKEND_PORT = 8001

AUTO_SEED = os.getenv("AUTO_SEED", "true").lower() in ("true", "1", "yes")

CHATBOT_SERVICE_URL = os.getenv("CHATBOT_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
CHATBOT_TIMEOUT_SECONDS = float(os.getenv("CHATBOT_TIMEOUT_SECONDS", "45.0"))

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY", "ftmm-compass-secret-key-production-dev-2026-safe-default"
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

DEFAULT_RATE_LIMIT = os.getenv("DEFAULT_RATE_LIMIT", "300/minute")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]
