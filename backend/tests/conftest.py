"""Fixture integrasi backend.

Tes ini berjalan terhadap database PostgreSQL pengembangan karena kontrak yang
diuji adalah query nyata (katalog, transkrip, polling). Seed dijalankan sekali
secara eksplisit, bukan sebagai efek samping import.
"""

import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

import app as app_module
from database import AsyncSessionLocal
from seed import seed_data

SEEDED_STUDENT = ("mahasiswa.testing@ftmm.unair.ac.id", "Mahasiswa2026!")
SEEDED_ADMIN = ("admin@ftmm.unair.ac.id", "AdminFTMM2026!")
SEEDED_LECTURER = ("dosen.testing@ftmm.unair.ac.id", "DosenFTMM2026!")


def _database_reachable() -> bool:
    async def probe() -> bool:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    return asyncio.run(probe())


if not _database_reachable():
    pytest.skip(
        "PostgreSQL tidak tersedia; jalankan `make db-up && make migrate`.",
        allow_module_level=True,
    )


@pytest.fixture(scope="session", autouse=True)
def seeded_database():
    asyncio.run(seed_data())


@pytest.fixture(scope="session")
def client(seeded_database):
    with TestClient(app_module.app) as test_client:
        yield test_client


def _login(client: TestClient, credentials: tuple[str, str]) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": credentials[0], "password": credentials[1]},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def student_token(client) -> str:
    return _login(client, SEEDED_STUDENT)


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    return _login(client, SEEDED_ADMIN)


@pytest.fixture(scope="session")
def lecturer_token(client) -> str:
    return _login(client, SEEDED_LECTURER)


@pytest.fixture
def student_headers(student_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def admin_headers(admin_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def lecturer_headers(lecturer_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {lecturer_token}"}
