import os

os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")

from collections.abc import AsyncIterator, Iterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

_CLEAN_TABLES = (
    "new_aparts_history",
    "new_aparts",
    "buildings_history",
    "buildings",
    "favorites",
    "building_price_stats",
    "districts",
    "municipal_districts",
    "metros",
)


@pytest.fixture(scope="session")
def pg_url() -> Iterator[str]:
    with PostgresContainer("postgres:16", driver="asyncpg") as pg:
        url = pg.get_connection_url()
        os.environ["DB"] = url
        os.environ["SCHEDULER_ENABLED"] = "false"

        # Settings is frozen and read at import; rebuild it and rebind the app engine.
        import src.config

        src.config.settings = src.config.Settings()

        import src.database

        src.database.engine = create_async_engine(url, poolclass=NullPool)
        src.database.Session = async_sessionmaker(
            src.database.engine, expire_on_commit=False
        )
        yield url


@pytest.fixture(scope="session")
def _migrated(pg_url: str) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", pg_url)
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def engine(pg_url: str, _migrated: None):
    import src.database

    return src.database.engine


@pytest.fixture
async def db(engine) -> AsyncIterator[AsyncSession]:
    session = async_sessionmaker(engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        await session.rollback()
        await session.close()
        async with engine.begin() as conn:
            rows = await conn.execute(
                text(
                    "SELECT tablename FROM pg_tables "
                    "WHERE schemaname = 'public' AND tablename = ANY(:t)"
                ),
                {"t": list(_CLEAN_TABLES)},
            )
            existing = [r[0] for r in rows]
            if existing:
                await conn.execute(
                    text(f"TRUNCATE {', '.join(existing)} RESTART IDENTITY CASCADE")
                )


@pytest.fixture
async def client(engine, monkeypatch) -> AsyncIterator[AsyncClient]:
    test_session = async_sessionmaker(engine, expire_on_commit=False)

    import src.database

    monkeypatch.setattr(src.database, "Session", test_session, raising=False)

    import src.service

    monkeypatch.setattr(src.service, "Session", test_session, raising=False)

    from src.api import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def seed_building(db: AsyncSession, **overrides) -> int:
    row = {
        "building_id": 1,
        "address": "ул. Тест, 1",
        "code": "test-bldg",
        "district": 1,
        "status_code": "PROCESSING",
        "family_hypotec": 0,
        "county": 1,
        "version": 1,
    }
    row.update(overrides)
    cols = ", ".join(row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO buildings ({cols}) VALUES ({vals})"), row)
    return row["building_id"]


async def seed_apart(db: AsyncSession, **overrides) -> int:
    row = {
        "new_apart_id": 100,
        "address": "ул. Тест, 1",
        "building": "Корпус 1",
        "building_id": "1",
        "building_code": "test-bldg",
        "number": "42",
        "rooms": "2",
        "floor": "5",
        "area": "54.3",
        "price": "12000000",
        "price_m": "221000",
        "type": "R",
        "version": 1,
    }
    row.update(overrides)
    cols = ", ".join(row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO new_aparts ({cols}) VALUES ({vals})"), row)
    return row["new_apart_id"]
