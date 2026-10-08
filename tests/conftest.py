import datetime
import os

os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")

from collections.abc import AsyncIterator, Iterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

from src.plates import parse_plate

_CLEAN_TABLES = (
    "new_aparts_history",
    "new_aparts",
    "buildings_history",
    "buildings",
    "favorites",
    "comments",
    "building_price_stats",
    "refresh_runs",
    "torgi_lots_history",
    "torgi_favorites",
    "torgi_lots",
    "torgi_lots_temp",
    "torgi_object_views",
    "torgi_objects_history",
    "torgi_object_favorites",
    "torgi_objects",
    "torgi_objects_temp",
    "plate_watches",
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

    import src.torgi

    monkeypatch.setattr(src.torgi, "Session", test_session, raising=False)

    import src.torgi_objects

    monkeypatch.setattr(src.torgi_objects, "Session", test_session, raising=False)

    from src.api import app
    from src.auth import hash_password, make_token

    # Все эндпоинты за авторизацией — тестовый клиент ходит под пользователем
    # tester (он же владелец избранного и комментариев в тестах).
    async with test_session() as session, session.begin():
        user_id = await session.scalar(
            text(
                "INSERT INTO users (username, password_hash) VALUES ('tester', :h) "
                "ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash "
                "RETURNING id"
            ),
            {"h": hash_password("secret")},
        )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {make_token(user_id)}"},
    ) as c:
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


async def seed_torgi_lot(db: AsyncSession, **overrides) -> int:
    """Разбор номера считается тем же parse_plate, что и при загрузке, —
    иначе plate_norm в тестах расходился бы с продом."""
    row = {
        "lot_id": 20200446,
        "name": "Легковой автомобиль на продажу, UAZ PATRIOT, 2013",
        "url": "https://torgi.mos.ru/tender/20200446",
        "status_text": "Прием заявок",
        "transport_category": "Легковые автомобили",
        "brand": "UAZ",
        "model": "PATRIOT",
        "year": 2013,
        "plate": "А001АА77",
        "vin": "XTT316300D1000000",
        "mileage": 272579,
        "start_price": 92397,
        "version": 1,
    }
    row.update(overrides)
    parts = parse_plate(row.get("plate"))
    row.setdefault("plate_norm", parts.plate_norm)
    row.setdefault("plate_region", parts.plate_region)
    row.setdefault("plate_valid", parts.plate_valid)
    cols = ", ".join(f'"{k}"' for k in row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO torgi_lots ({cols}) VALUES ({vals})"), row)
    return row["lot_id"]


async def seed_torgi_object(db: AsyncSession, **overrides) -> int:
    """Лот недвижимости. По умолчанию — живая квартира: приём заявок открыт."""
    row = {
        "lot_id": 18397774,
        "object_type_code": "nsi:41:30011568",
        "object_type_name": "Квартира",
        "tender_type_code": "nsi:tender_type_portal:13",
        "name": "2-комн. квартира на продажу, 50,70 м²",
        "url": "https://torgi.mos.ru/tender/18397774",
        "address": "город Москва, Бескудниковский бульвар, дом 13, кв. 442",
        "region_name": "Северный административный округ",
        "district_name": "Бескудниковский",
        "object_area": 50.7,
        "rooms_count": 2,
        "room_floor": 5,
        "floors": 18,
        "start_price": 10600000,
        "price_per_square": 209072.98,
        "request_end_date": datetime.datetime.now() + datetime.timedelta(days=7),
        "tender_date": datetime.datetime.now() + datetime.timedelta(days=14),
        "version": 1,
    }
    row.update(overrides)
    cols = ", ".join(f'"{k}"' for k in row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO torgi_objects ({cols}) VALUES ({vals})"), row)
    return row["lot_id"]
