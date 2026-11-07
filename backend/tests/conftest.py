"""Fixture integrasi backend.

Tes berjalan terhadap PostgreSQL pengembangan, tetapi setiap tes dibungkus satu
transaksi yang di-rollback. Database yang tidak tersedia menggagalkan suite.
"""

import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

import app as app_module
from database import AsyncSessionLocal, engine, get_db
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


@pytest.fixture(scope="session", autouse=True)
def seeded_database():
    if not _database_reachable():
        pytest.fail(
            "PostgreSQL tidak tersedia; jalankan `make db-up && make migrate`."
        )
    asyncio.run(seed_data())


@pytest.fixture(scope="session")
def client(seeded_database):
    with TestClient(app_module.app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def isolated_db(client):
    async def begin():
        connection = await engine.connect()
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        return connection, transaction, session

    connection, transaction, session = client.portal.call(begin)

    async def override_get_db():
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

    app_module.app.dependency_overrides[get_db] = override_get_db
    try:
        yield
    finally:
        app_module.app.dependency_overrides.pop(get_db, None)

        async def end():
            await session.close()
            await transaction.rollback()
            await connection.close()

        client.portal.call(end)


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
