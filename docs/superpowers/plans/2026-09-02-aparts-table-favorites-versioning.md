# Aparts Table, Favorites, Building Price Charts, Versioning Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the noisy version-history mechanism, restore the broken service/API layer, add Postgres-backed favorites, a daily data-refresh scheduler with per-building price snapshots, an aggregating `/aparts` endpoint (price deltas + discount flags + direct link), and a Vite/React/shadcn frontend with an apartments table and a per-building price-dynamics chart.

**Architecture:** Backend stays FastAPI + async SQLAlchemy + Alembic + alembic-utils. Version history is corrected at the trigger level: the trigger writes a history row and bumps `version` only when a meaningful column actually changed (`ROW(...) IS NOT DISTINCT FROM ROW(...)`). A new `frontend/` package (Vite + React + TS + Tailwind + shadcn/ui) is a separate service talking to the API over CORS (already open). Backend tests run against a real Postgres 16 in testcontainers.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic + alembic-utils, APScheduler, pytest + pytest-asyncio + testcontainers[postgres] + httpx; React 18 + Vite + TypeScript, Tailwind, shadcn/ui, TanStack Query, TanStack Table, Recharts, React Router.

## Global Constraints

- Python `requires-python = ">=3.13"`. Package manager: `uv` (`uv run ...`, `uv add ...`).
- Postgres image for tests and compose: `postgres:16`.
- All new backend DB access goes through `src/repository.py`; business orchestration through `src/service.py` (class `MosResService`); HTTP surface only in `src/api.py`.
- Raw SQL lives in `src/sql/<name>.sql`, loaded with `src.utils.read_from_sql_folder("<name>")` (returns a `str`).
- Alembic migration filenames are auto-timestamped; never hand-edit an existing migration, always add a new one. Migration head before this plan: `e68a81f738f4`.
- alembic-utils entities are declared in `src/pg_definitions.py` and registered in `alembic/env.py` via `register_entities([...])`.
- SQLAlchemy models subclass `src.database.Base` (which already supplies `created_at`, `updated_at`, `notes`).
- The scraper coerces all apartment/building scalar fields to `str` (`coerce_numbers_to_str=True`); numeric work in SQL uses `NULLIF(regexp_replace(<col>, '\D', '', 'g'), '')::numeric`.
- DB URL comes from `src.config.settings.DB` (a `PostgresDsn`). Tests override it before importing the app.
- Frontend base API URL: `import.meta.env.VITE_API_URL`.
- Commit after every task with a Conventional Commit message. End commit messages with:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK`

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `tests/__init__.py` | marks tests package |
| `tests/conftest.py` | testcontainers Postgres fixture, `alembic upgrade head`, per-test transaction rollback, `httpx.AsyncClient` app fixture, seed helpers |
| `tests/test_versioning.py` | trigger guard behaviour for `new_aparts` / `buildings` |
| `tests/test_aparts_endpoint.py` | `/aparts` computed fields + filters |
| `tests/test_favorites_endpoint.py` | favorites toggle + reflection in `/aparts` |
| `tests/test_buildings_endpoint.py` | `/buildings`, price-dynamics, versions |
| `tests/test_scheduler.py` | `refresh_building_price_stats` + `refresh_all` |
| `src/scheduler.py` | APScheduler `AsyncIOScheduler`, one daily job → `MosResService().refresh_all()` |
| `src/sql/aparts_table.sql` | the `/aparts` aggregating query |
| `src/sql/building_price_stats_refresh.sql` | upsert one snapshot row per building |
| `alembic/versions/<ts>_versioning_guard.py` | replace trigger functions with guarded versions |
| `alembic/versions/<ts>_favorites_and_price_stats.py` | create `favorites`, `building_price_stats` |
| `frontend/` | Vite + React + TS SPA (own `package.json`) |
| `frontend/src/lib/api.ts` | typed fetch wrapper over `VITE_API_URL` |
| `frontend/src/lib/types.ts` | shared response types |
| `frontend/src/hooks/useAparts.ts`, `useFavorites.ts`, `useBuilding.ts` | TanStack Query hooks |
| `frontend/src/components/ApartsTable.tsx` | reusable apartments table (TanStack Table + shadcn) |
| `frontend/src/components/ApartsToolbar.tsx` | search + filter checkboxes + building select + refresh button |
| `frontend/src/components/PriceCell.tsx`, `DiscountCell.tsx`, `FavoriteToggle.tsx` | table cell widgets |
| `frontend/src/components/BuildingPriceChart.tsx` | Recharts price-dynamics chart with metric switch |
| `frontend/src/pages/ApartsPage.tsx` | route `/` |
| `frontend/src/pages/BuildingPage.tsx` | route `/buildings/:id` |
| `frontend/README.md` | how to run the frontend |

### Modified

| Path | Change |
|---|---|
| `pyproject.toml` | add `apscheduler`; add `[dependency-groups] dev` with `pytest`, `pytest-asyncio`, `testcontainers`, `httpx` |
| `src/pg_definitions.py` | guarded trigger-function bodies |
| `src/models.py` | add `Favorite`, `BuildingPriceStat` |
| `src/repository.py` | fix `get_new_aparts_table`; add `get_aparts_table`, `list_favorites`, `add_favorite`, `remove_favorite`, `get_building_price_dynamics`, `refresh_building_price_stats` |
| `src/service.py` | restore `self`; wire to fixed repo fns; add `refresh_all`, favorites + price-dynamics passthroughs |
| `src/schemas.py` | add `ApartRow`, `FavoriteToggleResult`, `BuildingPricePoint` response models |
| `src/api.py` | `lifespan` starting/stopping scheduler (skippable via env); routes `/aparts`, `/aparts/{id}/versions`, `/favorites*`, `/buildings*`, `/buildings/{id}/price-dynamics`; `/update_data` → `refresh_all` |
| `alembic/env.py` | register new/renamed entities if signatures change (they don't here — bodies only) |
| `src/sql/buildings_history_trigger.sql`, `src/sql/new_apart_history_trigger.sql` | overwrite with the guarded bodies so the raw files match runtime |
| `README.md` | document new endpoints, scheduler, frontend, test command |
| `Makefile` | add `test` target |
| `docker-compose.yaml` | add optional `api` service note (leave DB as is) — doc only |

### Deleted

| Path | Reason |
|---|---|
| `src/client.py` | orphaned, broken (`from src.client import MosResClient` self-import; `MosResClient` undefined); not imported by runtime (`depends.py` → `src.service`) |

---

## Phase 1 — Versioning fix + service/API repair

### Task 1: Test harness + guarded version triggers

**Files:**
- Create: `tests/__init__.py`, `tests/conftest.py`, `tests/test_versioning.py`
- Modify: `pyproject.toml`, `src/pg_definitions.py`, `src/sql/new_apart_history_trigger.sql`, `src/sql/buildings_history_trigger.sql`
- Create: `alembic/versions/<ts>_versioning_guard.py` (via `uv run alembic revision`)

**Interfaces:**
- Consumes: existing `src.database.Base`/`Session`, `src.config.settings`, existing migrations through `e68a81f738f4`.
- Produces:
  - `tests/conftest.py` fixtures: `pg_url` (session, `str`), `engine` (session, `AsyncEngine` bound to `pg_url`), `db` (function, `AsyncSession`, rolls back), `client` (function, `httpx.AsyncClient` against the ASGI app), `seed_apart(db, **overrides) -> int` (returns `new_apart_id`), `seed_building(db, **overrides) -> int`.
  - Trigger contract: updating `new_aparts` / `buildings` with **no** change to a meaningful column produces **no** new `*_history` row and does **not** change `version`; a meaningful change adds exactly one row and increments `version` by 1; insert always writes history at `version = 1`.

- [ ] **Step 1: Add dependencies**

Run:
```bash
uv add apscheduler
uv add --dev pytest pytest-asyncio testcontainers httpx
```
Expected: `pyproject.toml` gains `apscheduler` in `[project].dependencies` and a `[dependency-groups] dev = [...]` (or `[tool.uv] dev-dependencies`) with the four test packages; `uv.lock` updates.

- [ ] **Step 2: Configure pytest-asyncio**

Add to `pyproject.toml`:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 3: Write `tests/__init__.py`**

```python
# empty — marks tests as a package
```

- [ ] **Step 4: Write `tests/conftest.py`**

```python
import asyncio
import os
from collections.abc import AsyncIterator, Iterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def pg_url() -> Iterator[str]:
    with PostgresContainer("postgres:16", driver="asyncpg") as pg:
        raw = pg.get_connection_url()  # postgresql+asyncpg://test:test@host:port/test
        os.environ["DB"] = raw
        yield raw


@pytest.fixture(scope="session")
def _migrated(pg_url: str) -> None:
    # Alembic reads src.config.settings.DB; env var DB was set in pg_url fixture.
    from alembic import command
    from alembic.config import Config

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", pg_url)
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def engine(pg_url: str, _migrated: None):
    eng = create_async_engine(pg_url, poolclass=None)
    yield eng
    asyncio.get_event_loop().run_until_complete(eng.dispose())


@pytest.fixture
async def db(engine) -> AsyncIterator[AsyncSession]:
    conn = await engine.connect()
    trans = await conn.begin()
    Session = async_sessionmaker(bind=conn, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()


@pytest.fixture
async def client(engine, monkeypatch) -> AsyncIterator[AsyncClient]:
    monkeypatch.setenv("SCHEDULER_ENABLED", "false")
    import src.database as database

    monkeypatch.setattr(database, "engine", engine, raising=False)
    monkeypatch.setattr(
        database, "Session", async_sessionmaker(bind=engine, expire_on_commit=False), raising=False
    )
    from src.api import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def seed_building(db: AsyncSession, **overrides) -> int:
    from sqlalchemy import text

    row = {
        "building_id": 1, "address": "ул. Тест, 1", "code": "test-bldg", "district": 1,
        "status_code": "PROCESSING", "family_hypotec": 0, "county": 1, "version": 1,
    }
    row.update(overrides)
    cols = ", ".join(row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO buildings ({cols}) VALUES ({vals})"), row)
    return row["building_id"]


async def seed_apart(db: AsyncSession, **overrides) -> int:
    from sqlalchemy import text

    row = {
        "new_apart_id": 100, "address": "ул. Тест, 1", "building": "Корпус 1",
        "building_id": "1", "building_code": "test-bldg", "number": "42", "rooms": "2",
        "floor": "5", "area": "54.3", "price": "12000000", "price_m": "221000",
        "type": "R", "version": 1,
    }
    row.update(overrides)
    cols = ", ".join(row)
    vals = ", ".join(f":{k}" for k in row)
    await db.execute(text(f"INSERT INTO new_aparts ({cols}) VALUES ({vals})"), row)
    return row["new_apart_id"]
```

- [ ] **Step 5: Write `tests/test_versioning.py` (failing)**

```python
from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _history_count(db, apart_id: int) -> int:
    r = await db.execute(
        text("SELECT count(*) FROM new_aparts_history WHERE new_apart_id = :i"), {"i": apart_id}
    )
    return r.scalar_one()


async def test_insert_writes_one_history_row_at_version_1(db):
    apart_id = await seed_apart(db)
    assert await _history_count(db, apart_id) == 1
    v = await db.execute(text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id})
    assert v.scalar_one() == 1


async def test_noop_update_writes_no_history_and_keeps_version(db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET address = address WHERE new_apart_id = :i"), {"i": apart_id}
    )
    assert await _history_count(db, apart_id) == 1
    v = await db.execute(text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id})
    assert v.scalar_one() == 1


async def test_meaningful_update_adds_one_history_row_and_bumps_version(db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET price = '11000000' WHERE new_apart_id = :i"), {"i": apart_id}
    )
    assert await _history_count(db, apart_id) == 2
    v = await db.execute(text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id})
    assert v.scalar_one() == 2
    versions = await db.execute(
        text("SELECT version FROM new_aparts_history WHERE new_apart_id = :i ORDER BY version"),
        {"i": apart_id},
    )
    assert [x[0] for x in versions] == [1, 2]


async def test_buildings_noop_update_writes_no_history(db):
    bid = await seed_building(db)
    r0 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    before = r0.scalar_one()
    await db.execute(text("UPDATE buildings SET code = code WHERE building_id = :i"), {"i": bid})
    r1 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    assert r1.scalar_one() == before


async def test_buildings_meaningful_update_adds_history(db):
    bid = await seed_building(db)
    r0 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    before = r0.scalar_one()
    await db.execute(
        text("UPDATE buildings SET status_code = 'FINISHED' WHERE building_id = :i"), {"i": bid}
    )
    r1 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    assert r1.scalar_one() == before + 1
```

- [ ] **Step 6: Run tests — expect failure**

Run: `uv run pytest tests/test_versioning.py -v`
Expected: `test_noop_update_*` FAIL — current trigger writes a history row and bumps `version` on every update. (First run also pulls the `postgres:16` image; allow time.)

- [ ] **Step 7: Rewrite trigger bodies in `src/pg_definitions.py`**

Replace the `definition=` strings of `insert_buildings_history_func` and `insert_new_apart_history_func` with guarded bodies. Keep the `PGFunction` signatures exactly as they are (`insert_buildings_history()`, `insert_new_aparts_history()`), and keep the two `PGTrigger` objects unchanged.

`insert_new_apart_history_func` definition:
```sql
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(
            OLD.address, OLD.building, OLD.building_id, OLD.building_code, OLD."number",
            OLD.rooms, OLD."floor", OLD.block, OLD.area, OLD.price, OLD.price_m, OLD."type",
            OLD.term_of_application, OLD.open_sale, OLD.reserve, OLD.y2_sell, OLD.for_sell,
            OLD.num_on_floor, OLD.property, OLD.advants, OLD.article,
            OLD.price_with_discount, OLD.percentage_discount, OLD.auction, OLD.block_name
        ) IS NOT DISTINCT FROM ROW(
            NEW.address, NEW.building, NEW.building_id, NEW.building_code, NEW."number",
            NEW.rooms, NEW."floor", NEW.block, NEW.area, NEW.price, NEW.price_m, NEW."type",
            NEW.term_of_application, NEW.open_sale, NEW.reserve, NEW.y2_sell, NEW.for_sell,
            NEW.num_on_floor, NEW.property, NEW.advants, NEW.article,
            NEW.price_with_discount, NEW.percentage_discount, NEW.auction, NEW.block_name
        ) THEN
            RETURN NEW;
        END IF;
    END IF;

    NEW."version" := COALESCE(OLD."version", 0) + 1;

    INSERT INTO new_aparts_history (
        new_apart_id, address, building,
        building_id, building_code, "number",
        rooms, "floor", block, area,
        price, price_m, "type",
        term_of_application, open_sale, reserve,
        y2_sell, for_sell, num_on_floor,
        property, advants, article,
        price_with_discount, percentage_discount,
        auction, block_name,
        created_at, updated_at,
        "version"
    )
    VALUES (
        NEW.new_apart_id, NEW.address, NEW.building,
        NEW.building_id, NEW.building_code, NEW."number",
        NEW.rooms, NEW."floor", NEW.block, NEW.area,
        NEW.price, NEW.price_m, NEW."type",
        NEW.term_of_application, NEW.open_sale, NEW.reserve,
        NEW.y2_sell, NEW.for_sell, NEW.num_on_floor,
        NEW.property, NEW.advants, NEW.article,
        NEW.price_with_discount, NEW.percentage_discount,
        NEW.auction, NEW.block_name,
        NEW.created_at, NEW.updated_at,
        NEW."version"
    );
    RETURN NEW;
END;
$function$
```

`insert_buildings_history_func` definition:
```sql
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(
            OLD.address, OLD.code, OLD.district, OLD.latitude, OLD.longitude,
            OLD.status_code, OLD.finishing_code, OLD.metro, OLD.metro_car, OLD.metro_walk,
            OLD.floors, OLD.flats, OLD.vvod, OLD.anons_texts, OLD.family_hypotec, OLD.county
        ) IS NOT DISTINCT FROM ROW(
            NEW.address, NEW.code, NEW.district, NEW.latitude, NEW.longitude,
            NEW.status_code, NEW.finishing_code, NEW.metro, NEW.metro_car, NEW.metro_walk,
            NEW.floors, NEW.flats, NEW.vvod, NEW.anons_texts, NEW.family_hypotec, NEW.county
        ) THEN
            RETURN NEW;
        END IF;
    END IF;

    NEW."version" := COALESCE(OLD."version", 0) + 1;

    INSERT INTO buildings_history (
        building_id,    "version",      created_at,
        updated_at,     address,        code,
        district,       latitude,       longitude,
        status_code,    finishing_code, metro,
        metro_car,      metro_walk,     floors,
        flats,          vvod,           anons_texts,
        family_hypotec, county,         notes
    ) VALUES (
        NEW.building_id,    NEW."version",      NEW.created_at,
        NEW.updated_at,     NEW.address,        NEW.code,
        NEW.district,       NEW.latitude,       NEW.longitude,
        NEW.status_code,    NEW.finishing_code, NEW.metro,
        NEW.metro_car,      NEW.metro_walk,     NEW.floors,
        NEW.flats,          NEW.vvod,           NEW.anons_texts,
        NEW.family_hypotec, NEW.county,         NEW.notes
    );
    RETURN NEW;
END;
$function$
```

- [ ] **Step 8: Overwrite the raw SQL files to match**

`src/sql/new_apart_history_trigger.sql` and `src/sql/buildings_history_trigger.sql`: replace their contents with `CREATE OR REPLACE FUNCTION public.<name>() ...` using the exact bodies from Step 7, followed by the existing `CREATE OR REPLACE TRIGGER ...` statements (unchanged). These files are reference-only (runtime uses alembic-utils) but must not contradict it — the old `buildings_history_trigger.sql` wrongly inserts into `new_aparts_history`.

- [ ] **Step 9: Generate the migration**

Run: `DB="postgresql+asyncpg://postgres:password@localhost:5432/postgres" uv run alembic revision --autogenerate -m "versioning guard"`
Expected: a new file `alembic/versions/<ts>_versioning_guard.py` whose `upgrade()` calls `op.replace_entity(PGFunction(...))` for both functions (alembic-utils detects the body change). If autogenerate can't reach a DB, instead run `uv run alembic revision -m "versioning guard"` and hand-write:

```python
from alembic import op
from src.pg_definitions import insert_buildings_history_func, insert_new_apart_history_func

def upgrade() -> None:
    op.replace_entity(insert_new_apart_history_func)
    op.replace_entity(insert_buildings_history_func)

def downgrade() -> None:
    pass  # forward-only: old noisy bodies are not restored
```
Set `down_revision = "e68a81f738f4"`.

- [ ] **Step 10: Run tests — expect pass**

Run: `uv run pytest tests/test_versioning.py -v`
Expected: all 6 PASS.

- [ ] **Step 11: Commit**

```bash
git add pyproject.toml uv.lock tests/ src/pg_definitions.py src/sql/ alembic/versions/
git commit -m "fix: guard version-history triggers against no-op updates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 2: Repair the service / repository / API layer

**Files:**
- Modify: `src/repository.py`, `src/service.py`, `src/api.py`, `src/depends.py`
- Delete: `src/client.py`
- Create: `tests/test_smoke.py`

**Interfaces:**
- Consumes: fixtures from Task 1 (`client`, `db`, `seed_apart`, `seed_building`).
- Produces:
  - `MosResService` instance methods (all with `self`): `update_all_data()`, `get_excel_file()`, `refresh_all()`, `get_new_aparts_history(new_apart_id: int)`, `get_buildings_history(building_id: int)`, `get_buildings_table()`, `get_buildings_apartments(building_id: int)`.
  - `src.repository.get_new_aparts_history(*, new_apart_id: int, session) -> list[Mapping]`
  - `src.repository.get_buildings_history(*, building_id: int, session) -> list[Mapping]`
  - `src.repository.get_buildings_table(*, session) -> list[Mapping]`
  - API routes return their payloads (no bare `None`).

- [ ] **Step 1: Write `tests/test_smoke.py` (failing)**

```python
from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def test_buildings_endpoint_returns_rows(client, db):
    await seed_building(db)
    await db.commit()
    r = await client.get("/buildings")
    assert r.status_code == 200
    assert any(row["building_id"] == 1 for row in r.json())


async def test_apart_versions_endpoint_returns_history(client, db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET price = '9000000' WHERE new_apart_id = :i"), {"i": apart_id}
    )
    await db.commit()
    r = await client.get(f"/aparts/{apart_id}/versions")
    assert r.status_code == 200
    assert [row["version"] for row in r.json()] == [1, 2]
```

Note: `db` and `client` share one engine but `db` runs inside a rolled-back transaction, so tests that need the API to see the data call `await db.commit()` — acceptable here because each test's rows use fixed ids and `conftest`'s `db` fixture still closes/rolls back its own transaction; add a cleanup in a later step if collisions appear. (If cross-test bleed shows up, switch `db` to `TRUNCATE new_aparts, new_aparts_history, buildings, buildings_history, favorites RESTART IDENTITY CASCADE` in teardown instead of nested-transaction rollback.)

- [ ] **Step 2: Run — expect failure**

Run: `uv run pytest tests/test_smoke.py -v`
Expected: FAIL — `get_buildings_table` is defined without `self` (raises `TypeError`), `/aparts/{id}/versions` route returns `None` or errors.

- [ ] **Step 3: Fix `src/repository.py`**

Replace the four read helpers with keyword-only, correctly-named versions:

```python
async def get_new_aparts_table(*, new_apart_ids: list[int] | None, session: AsyncSession):
    stmt = select(NewApart)
    if new_apart_ids:
        stmt = stmt.where(NewApart.new_apart_id.in_(new_apart_ids))
    result = await session.execute(stmt)
    return result.mappings().all()


async def get_new_aparts_history(*, new_apart_id: int, session: AsyncSession):
    result = await session.execute(
        select(NewApartHistory)
        .where(NewApartHistory.new_apart_id == new_apart_id)
        .order_by(NewApartHistory.version)
    )
    return result.mappings().all()


async def get_buildings_table(*, session: AsyncSession):
    result = await session.execute(select(Building))
    return result.mappings().all()


async def get_buildings_history(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        select(BuildingHistory)
        .where(BuildingHistory.building_id == building_id)
        .order_by(BuildingHistory.version)
    )
    return result.mappings().all()


async def get_buildings_apartments(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        select(NewApart).where(NewApart.building_id == str(building_id))
    )
    return result.mappings().all()
```

- [ ] **Step 4: Rewrite `src/service.py`**

Keep the working `MosResService` that already lives in `src/service.py` (it has the HTTP scrape methods `get_building_and_aparts`, `get_metro_district_municipal_district`, a real `update_all_data`, and `get_excel_file`). Fix only the broken read-through methods at the bottom — give them `self` and correct calls:

```python
    async def get_new_aparts_history(self, new_apart_id: int):
        async with Session() as session:
            return await get_new_aparts_history(new_apart_id=new_apart_id, session=session)

    async def get_buildings_history(self, building_id: int):
        async with Session() as session:
            return await get_buildings_history(building_id=building_id, session=session)

    async def get_buildings_table(self):
        async with Session() as session:
            return await get_buildings_table(session=session)

    async def get_buildings_apartments(self, building_id: int):
        async with Session() as session:
            return await get_buildings_apartments(building_id=building_id, session=session)
```

Delete the broken `get_new_aparts_table` method that calls `get_new_aparts_history(new_apartd_ids=...)` — it is superseded by `get_aparts_table` added in Task 6. Update the `from src.repository import (...)` block to import only what is used now (`insert_into_table`, `upsert_with_except_from_temp_table`, `get_data_for_excel_file`, `get_buildings_apartments`, `get_new_aparts_history`, `get_buildings_history`, `get_buildings_table`).

- [ ] **Step 5: Delete `src/client.py`**

Run: `git rm src/client.py`
Rationale: self-importing (`from src.client import MosResClient`), `MosResClient` never defined, not referenced by `depends.py`/`api.py`/`service.py`.

- [ ] **Step 6: Fix `src/api.py` routes**

```python
@app.get("/aparts", tags=["aparts"])
async def get_aparts(
    building_id: int | None = None,
    favorites_only: bool = False,
    discount_only: bool = False,
    price_drop_only: bool = False,
    q: str | None = None,
    mosres_service: MosResService = Depends(get_mosres_service),
):
    return await mosres_service.get_aparts_table(
        building_id=building_id,
        favorites_only=favorites_only,
        discount_only=discount_only,
        price_drop_only=price_drop_only,
        q=q,
    )


@app.get("/aparts/{new_apart_id}/versions", tags=["aparts"])
async def get_apart_versions(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_new_aparts_history(new_apart_id)


@app.get("/buildings", tags=["buildings"])
async def get_buildings(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.get_buildings_table()


@app.get("/buildings/{building_id}/versions", tags=["buildings"])
async def get_building_versions(
    building_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_buildings_history(building_id)
```

`get_aparts_table` does not exist yet — Step 7 stubs it so the app imports; Task 6 implements it.

- [ ] **Step 7: Temporary stub for `get_aparts_table` in `src/service.py`**

```python
    async def get_aparts_table(self, **_filters):
        async with Session() as session:
            return await get_buildings_table(session=session) and []  # replaced in Task 6
```
Simpler: `return []`. Add `# TODO(Task 6): real aggregating query` — this is the one allowed transient stub; Task 6 replaces it and its test proves it.

- [ ] **Step 8: Run — expect pass**

Run: `uv run pytest tests/test_smoke.py tests/test_versioning.py -v`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ tests/
git commit -m "fix: restore service/repository/API layer, drop dead client.py

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

## Phase 2 — Favorites, price-stats table, scheduler

### Task 3: `Favorite` + `BuildingPriceStat` models and migration

**Files:**
- Modify: `src/models.py`
- Create: `alembic/versions/<ts>_favorites_and_price_stats.py`
- Create: `tests/test_new_tables.py`

**Interfaces:**
- Produces:
  - `src.models.Favorite` — table `favorites`, columns `new_apart_id: int` (PK, FK → `new_aparts.new_apart_id`, `ondelete="CASCADE"`), plus `created_at/updated_at/notes` from `Base`.
  - `src.models.BuildingPriceStat` — table `building_price_stats`, columns `id: int` (PK, identity), `building_id: int`, `snapshot_date: date`, `avg_price_m: Decimal | None`, `min_price_m: Decimal | None`, `median_price_m: Decimal | None`, `apart_count: int`; unique constraint `(building_id, snapshot_date)` named `uq_building_price_stats_building_id`.

- [ ] **Step 1: Write `tests/test_new_tables.py` (failing)**

```python
from sqlalchemy import text


async def test_favorites_table_exists(db):
    r = await db.execute(text("SELECT to_regclass('public.favorites')"))
    assert r.scalar_one() == "favorites"


async def test_building_price_stats_unique_day(db):
    await db.execute(
        text(
            "INSERT INTO building_price_stats (building_id, snapshot_date, apart_count) "
            "VALUES (1, '2026-09-01', 3)"
        )
    )
    import pytest
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        await db.execute(
            text(
                "INSERT INTO building_price_stats (building_id, snapshot_date, apart_count) "
                "VALUES (1, '2026-09-01', 5)"
            )
        )
```

- [ ] **Step 2: Run — expect failure**

Run: `uv run pytest tests/test_new_tables.py -v`
Expected: FAIL — `to_regclass` returns `None`.

- [ ] **Step 3: Add models to `src/models.py`**

```python
import datetime
from decimal import Decimal

import sqlalchemy as sa
import sqlalchemy.orm as saorm


class Favorite(Base):
    __tablename__ = "favorites"

    new_apart_id: saorm.Mapped[int] = saorm.mapped_column(
        sa.ForeignKey("new_aparts.new_apart_id", ondelete="CASCADE"), primary_key=True
    )


class BuildingPriceStat(Base):
    __tablename__ = "building_price_stats"
    __table_args__ = (sa.UniqueConstraint("building_id", "snapshot_date"),)

    id: saorm.Mapped[int] = saorm.mapped_column(primary_key=True, autoincrement=True)
    building_id: saorm.Mapped[int] = saorm.mapped_column(nullable=False)
    snapshot_date: saorm.Mapped[datetime.date] = saorm.mapped_column(
        server_default=sa.func.now(), nullable=False
    )
    avg_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    min_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    median_price_m: saorm.Mapped[Decimal | None] = saorm.mapped_column(sa.Numeric)
    apart_count: saorm.Mapped[int] = saorm.mapped_column(nullable=False)
```

- [ ] **Step 4: Generate migration**

Run: `DB="postgresql+asyncpg://postgres:password@localhost:5432/postgres" uv run alembic revision --autogenerate -m "favorites and building_price_stats"`
Expected: `upgrade()` creates both tables + the unique constraint. If no DB reachable, hand-write with `op.create_table(...)` mirroring the models, `down_revision` = the `versioning_guard` revision id.

- [ ] **Step 5: Verify migration head chain**

Run: `uv run alembic history | head -5`
Expected: new revision → `versioning_guard` → `e68a81f738f4`.

- [ ] **Step 6: Run — expect pass**

Run: `uv run pytest tests/test_new_tables.py -v`
Expected: both PASS (conftest `_migrated` runs `upgrade head` on a fresh container).

- [ ] **Step 7: Commit**

```bash
git add src/models.py alembic/versions/ tests/test_new_tables.py
git commit -m "feat: add favorites and building_price_stats tables

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 4: `refresh_building_price_stats` + `refresh_all`

**Files:**
- Create: `src/sql/building_price_stats_refresh.sql`
- Modify: `src/repository.py`, `src/service.py`
- Create: `tests/test_scheduler.py`

**Interfaces:**
- Consumes: `read_from_sql_folder`, `Session`, models from Task 3.
- Produces:
  - `src.repository.refresh_building_price_stats(*, session: AsyncSession) -> int` — runs the upsert, returns affected row count.
  - `src.repository.get_building_price_dynamics(*, building_id: int, session) -> list[Mapping]` — rows `{snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count}` ordered by `snapshot_date`.
  - `MosResService.refresh_all(self) -> dict` — `await self.update_all_data()` then `refresh_building_price_stats` in its own committed session; returns `{"status": "success"}`.
  - `MosResService.get_building_price_dynamics(self, building_id: int)`.

- [ ] **Step 1: Write `src/sql/building_price_stats_refresh.sql`**

```sql
INSERT INTO building_price_stats
    (building_id, snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count)
SELECT
    building_id,
    now()::date,
    avg(price_m_num),
    min(price_m_num),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_m_num),
    count(*)
FROM (
    SELECT
        (building_id)::int AS building_id,
        NULLIF(regexp_replace(price_m, '\D', '', 'g'), '')::numeric AS price_m_num
    FROM new_aparts
    WHERE building_id ~ '^\d+$'
) s
WHERE price_m_num IS NOT NULL
GROUP BY building_id
ON CONFLICT (building_id, snapshot_date) DO UPDATE SET
    avg_price_m = EXCLUDED.avg_price_m,
    min_price_m = EXCLUDED.min_price_m,
    median_price_m = EXCLUDED.median_price_m,
    apart_count = EXCLUDED.apart_count;
```

- [ ] **Step 2: Write `tests/test_scheduler.py` (failing)**

```python
from sqlalchemy import text

from src.repository import get_building_price_dynamics, refresh_building_price_stats
from tests.conftest import seed_apart, seed_building


async def test_refresh_builds_one_row_per_building(db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await seed_apart(db, new_apart_id=2, building_id="1", price_m="300000")
    await refresh_building_price_stats(session=db)
    rows = await get_building_price_dynamics(building_id=1, session=db)
    assert len(rows) == 1
    assert rows[0]["avg_price_m"] == 250000
    assert rows[0]["min_price_m"] == 200000
    assert rows[0]["apart_count"] == 2


async def test_refresh_same_day_upserts(db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await refresh_building_price_stats(session=db)
    await db.execute(text("UPDATE new_aparts SET price_m = '400000' WHERE new_apart_id = 1"))
    await refresh_building_price_stats(session=db)
    rows = await get_building_price_dynamics(building_id=1, session=db)
    assert len(rows) == 1
    assert rows[0]["avg_price_m"] == 400000
```

- [ ] **Step 3: Run — expect failure**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: `ImportError` (functions not defined).

- [ ] **Step 4: Add repository functions in `src/repository.py`**

```python
from src.utils import read_from_sql_folder  # add to imports


async def refresh_building_price_stats(*, session: AsyncSession) -> int:
    sql = await read_from_sql_folder("building_price_stats_refresh")
    result = await session.execute(text(sql))
    return result.rowcount


async def get_building_price_dynamics(*, building_id: int, session: AsyncSession):
    result = await session.execute(
        text(
            "SELECT snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count "
            "FROM building_price_stats WHERE building_id = :b ORDER BY snapshot_date"
        ),
        {"b": building_id},
    )
    return result.mappings().all()
```

- [ ] **Step 5: Add service methods in `src/service.py`**

```python
    async def refresh_all(self) -> dict:
        await self.update_all_data()
        async with Session() as session:
            async with session.begin():
                await refresh_building_price_stats(session=session)
        return {"status": "success"}

    async def get_building_price_dynamics(self, building_id: int):
        async with Session() as session:
            return await get_building_price_dynamics(building_id=building_id, session=session)
```
Add `refresh_building_price_stats`, `get_building_price_dynamics` to the repository import block.

- [ ] **Step 6: Run — expect pass**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ tests/test_scheduler.py
git commit -m "feat: building price-stats refresh and refresh_all

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 5: APScheduler wiring

**Files:**
- Create: `src/scheduler.py`
- Modify: `src/api.py`, `src/config.py`
- Modify: `tests/test_scheduler.py` (add one test)

**Interfaces:**
- Consumes: `MosResService.refresh_all`.
- Produces:
  - `src.config.settings.SCHEDULER_ENABLED: bool` (default `True`), `settings.REFRESH_HOUR: int` (default `4`).
  - `src.scheduler.build_scheduler() -> AsyncIOScheduler` — one `CronTrigger(hour=settings.REFRESH_HOUR)` job, id `"daily-refresh"`, `coalesce=True`, `max_instances=1`, `misfire_grace_time=3600`.
  - `src.api.app` lifespan starts the scheduler when `settings.SCHEDULER_ENABLED`, shuts it down on exit.

- [ ] **Step 1: Add settings fields to `src/config.py`**

```python
    SCHEDULER_ENABLED: bool = True
    REFRESH_HOUR: int = 4
```
(env var names: `SCHEDULER_ENABLED`, `REFRESH_HOUR`.)

- [ ] **Step 2: Write `src/scheduler.py`**

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from src.config import settings
from src.service import MosResService


async def _run_refresh() -> None:
    logger.info("scheduled refresh_all start")
    await MosResService().refresh_all()
    logger.info("scheduled refresh_all done")


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _run_refresh,
        trigger=CronTrigger(hour=settings.REFRESH_HOUR, minute=0),
        id="daily-refresh",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600,
        replace_existing=True,
    )
    return scheduler
```

- [ ] **Step 3: Add lifespan to `src/api.py`**

```python
from contextlib import asynccontextmanager

from src.config import settings
from src.scheduler import build_scheduler


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler = None
    if settings.SCHEDULER_ENABLED:
        scheduler = build_scheduler()
        scheduler.start()
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="mosres-api",
    version="0.1.0",
    description="...",  # keep existing text
    lifespan=lifespan,
)
```

- [ ] **Step 4: Add scheduler test to `tests/test_scheduler.py`**

```python
def test_build_scheduler_registers_daily_job():
    from src.scheduler import build_scheduler

    scheduler = build_scheduler()
    job = scheduler.get_job("daily-refresh")
    assert job is not None
    assert job.max_instances == 1
```

- [ ] **Step 5: Run — expect pass**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: 3 PASS. Also `uv run pytest -v` — full suite green (the `client` fixture set `SCHEDULER_ENABLED=false`, so the app lifespan does not spawn a scheduler in tests).

- [ ] **Step 6: Commit**

```bash
git add src/ tests/test_scheduler.py
git commit -m "feat: daily APScheduler job for data refresh

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

## Phase 3 — Endpoints

### Task 6: `/aparts` aggregating query + `ApartRow` schema

**Files:**
- Create: `src/sql/aparts_table.sql`
- Modify: `src/repository.py`, `src/service.py`, `src/schemas.py`, `src/api.py`
- Create: `tests/test_aparts_endpoint.py`

**Interfaces:**
- Consumes: `read_from_sql_folder`, `favorites` table, `new_aparts` + `new_aparts_history`.
- Produces:
  - `src.repository.get_aparts_table(*, building_id, favorites_only, discount_only, price_drop_only, q, session) -> list[Mapping]`
  - `src.schemas.ApartRow` (Pydantic) with fields: `new_apart_id:int, address:str|None, building:str|None, building_id:str|None, number:str|None, rooms:str|None, floor:str|None, area:str|None, price:Decimal|None, price_prev:Decimal|None, price_delta_prev:Decimal|None, price_delta_prev_pct:Decimal|None, price_max:Decimal|None, price_delta_max_pct:Decimal|None, has_discount:bool, discount_is_new:bool, discount_pct:Decimal|None, is_favorite:bool, mosres_url:str, updated_at:datetime`
  - `MosResService.get_aparts_table(self, *, building_id=None, favorites_only=False, discount_only=False, price_drop_only=False, q=None) -> list[ApartRow]`

- [ ] **Step 1: Write `src/sql/aparts_table.sql`**

```sql
WITH cur AS (
    SELECT
        new_apart_id,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(TRIM(COALESCE(price_with_discount, '')), '') IS NOT NULL AS has_discount
    FROM new_aparts
),
hp AS (
    SELECT
        new_apart_id,
        version,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(TRIM(COALESCE(price_with_discount, '')), '') IS NOT NULL AS had_discount
    FROM new_aparts_history
)
SELECT
    na.new_apart_id,
    na.address, na.building, na.building_id, na."number", na.rooms, na."floor", na.area,
    cur.price_num                                                        AS price,
    prev.price_num                                                       AS price_prev,
    (cur.price_num - prev.price_num)                                     AS price_delta_prev,
    CASE WHEN prev.price_num > 0
         THEN round((cur.price_num - prev.price_num) / prev.price_num * 100, 1)
    END                                                                  AS price_delta_prev_pct,
    mx.price_max,
    CASE WHEN mx.price_max > 0
         THEN round((cur.price_num - mx.price_max) / mx.price_max * 100, 1)
    END                                                                  AS price_delta_max_pct,
    cur.has_discount,
    (cur.has_discount AND NOT COALESCE(prev.had_discount, false))        AS discount_is_new,
    NULLIF(regexp_replace(COALESCE(na.percentage_discount, ''), '\D', '', 'g'), '')::numeric
                                                                        AS discount_pct,
    (fav.new_apart_id IS NOT NULL)                                       AS is_favorite,
    concat(
        'https://xn--80aae5aibotfo5h.xn--p1ai/obekty/',
        na.building_code, '/?flat_id=', na.new_apart_id
    )                                                                    AS mosres_url,
    na.updated_at
FROM new_aparts na
JOIN cur ON cur.new_apart_id = na.new_apart_id
LEFT JOIN LATERAL (
    SELECT hp.price_num, hp.had_discount
    FROM hp
    WHERE hp.new_apart_id = na.new_apart_id AND hp.version < na."version"
    ORDER BY hp.version DESC
    LIMIT 1
) prev ON true
LEFT JOIN LATERAL (
    SELECT max(hp.price_num) AS price_max
    FROM hp WHERE hp.new_apart_id = na.new_apart_id
) mx ON true
LEFT JOIN favorites fav ON fav.new_apart_id = na.new_apart_id
WHERE (:building_id IS NULL OR (na.building_id ~ '^\d+$' AND (na.building_id)::int = :building_id))
  AND (NOT :favorites_only OR fav.new_apart_id IS NOT NULL)
  AND (NOT :discount_only OR cur.has_discount)
  AND (NOT :price_drop_only OR (prev.price_num IS NOT NULL AND cur.price_num < prev.price_num))
  AND (
        :q IS NULL
        OR na.address ILIKE :q_like
        OR na.building ILIKE :q_like
        OR na."number" ILIKE :q_like
      )
ORDER BY na.new_apart_id;
```

- [ ] **Step 2: Write `tests/test_aparts_endpoint.py` (failing)**

```python
from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _prep_three_versions(db):
    await seed_building(db)
    apart_id = await seed_apart(db, price="12000000")
    await db.execute(text("UPDATE new_aparts SET price = '13000000' WHERE new_apart_id = :i"), {"i": apart_id})
    await db.execute(
        text(
            "UPDATE new_aparts SET price = '11000000', price_with_discount = '10500000', "
            "percentage_discount = '5' WHERE new_apart_id = :i"
        ),
        {"i": apart_id},
    )
    await db.commit()
    return apart_id


async def test_computed_fields(client, db):
    apart_id = await _prep_three_versions(db)
    r = await client.get("/aparts")
    assert r.status_code == 200
    row = next(x for x in r.json() if x["new_apart_id"] == apart_id)
    assert float(row["price"]) == 11000000
    assert float(row["price_prev"]) == 13000000
    assert float(row["price_delta_prev"]) == -2000000
    assert float(row["price_delta_prev_pct"]) == -15.4
    assert float(row["price_max"]) == 13000000
    assert float(row["price_delta_max_pct"]) == -15.4
    assert row["has_discount"] is True
    assert row["discount_is_new"] is True
    assert float(row["discount_pct"]) == 5
    assert row["is_favorite"] is False
    assert row["mosres_url"].endswith(f"/?flat_id={apart_id}")


async def test_single_version_has_no_prev(client, db):
    await seed_building(db)
    apart_id = await seed_apart(db)
    await db.commit()
    r = await client.get("/aparts")
    row = next(x for x in r.json() if x["new_apart_id"] == apart_id)
    assert row["price_prev"] is None
    assert row["price_delta_prev"] is None
    assert row["discount_is_new"] is False
```

- [ ] **Step 3: Run — expect failure**

Run: `uv run pytest tests/test_aparts_endpoint.py -v`
Expected: FAIL — service still returns the Task 2 stub `[]`.

- [ ] **Step 4: Add `ApartRow` to `src/schemas.py`**

```python
import datetime
from decimal import Decimal

from pydantic import BaseModel


class ApartRow(BaseModel):
    new_apart_id: int
    address: str | None = None
    building: str | None = None
    building_id: str | None = None
    number: str | None = None
    rooms: str | None = None
    floor: str | None = None
    area: str | None = None
    price: Decimal | None = None
    price_prev: Decimal | None = None
    price_delta_prev: Decimal | None = None
    price_delta_prev_pct: Decimal | None = None
    price_max: Decimal | None = None
    price_delta_max_pct: Decimal | None = None
    has_discount: bool = False
    discount_is_new: bool = False
    discount_pct: Decimal | None = None
    is_favorite: bool = False
    mosres_url: str
    updated_at: datetime.datetime
```

- [ ] **Step 5: Add `get_aparts_table` to `src/repository.py`**

```python
async def get_aparts_table(
    *,
    building_id: int | None,
    favorites_only: bool,
    discount_only: bool,
    price_drop_only: bool,
    q: str | None,
    session: AsyncSession,
):
    sql = await read_from_sql_folder("aparts_table")
    result = await session.execute(
        text(sql),
        {
            "building_id": building_id,
            "favorites_only": favorites_only,
            "discount_only": discount_only,
            "price_drop_only": price_drop_only,
            "q": q,
            "q_like": f"%{q}%" if q else None,
        },
    )
    return result.mappings().all()
```

- [ ] **Step 6: Replace the stub in `src/service.py`**

```python
    async def get_aparts_table(
        self,
        *,
        building_id: int | None = None,
        favorites_only: bool = False,
        discount_only: bool = False,
        price_drop_only: bool = False,
        q: str | None = None,
    ) -> list[ApartRow]:
        async with Session() as session:
            rows = await get_aparts_table(
                building_id=building_id,
                favorites_only=favorites_only,
                discount_only=discount_only,
                price_drop_only=price_drop_only,
                q=q,
                session=session,
            )
        return [ApartRow.model_validate(dict(r)) for r in rows]
```
Add `from src.schemas import ApartRow` and `get_aparts_table` to imports.

- [ ] **Step 7: Set `response_model` on the route in `src/api.py`**

```python
from src.schemas import ApartRow

@app.get("/aparts", tags=["aparts"], response_model=list[ApartRow])
async def get_aparts(...):  # body unchanged from Task 2
```

- [ ] **Step 8: Run — expect pass**

Run: `uv run pytest tests/test_aparts_endpoint.py -v`
Expected: both PASS. If `price_delta_prev_pct` differs (rounding), assert against the exact `round(x,1)` value Postgres returns and adjust the literal.

- [ ] **Step 9: Commit**

```bash
git add src/ tests/test_aparts_endpoint.py
git commit -m "feat: aggregating /aparts endpoint with price deltas and discount flags

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 7: `/aparts` filters

**Files:**
- Modify: `tests/test_aparts_endpoint.py`

**Interfaces:**
- Consumes: `get_aparts_table` params from Task 6 (already implemented — this task only adds coverage; if a filter is wrong, fix `src/sql/aparts_table.sql`).

- [ ] **Step 1: Add filter tests**

```python
async def test_building_id_filter(client, db):
    await seed_building(db, building_id=1)
    await seed_building(db, building_id=2, code="b2")
    await seed_apart(db, new_apart_id=1, building_id="1")
    await seed_apart(db, new_apart_id=2, building_id="2")
    await db.commit()
    r = await client.get("/aparts", params={"building_id": 2})
    ids = {x["new_apart_id"] for x in r.json()}
    assert ids == {2}


async def test_price_drop_only_filter(client, db):
    await seed_building(db)
    a = await seed_apart(db, new_apart_id=1, price="12000000")
    await db.execute(text("UPDATE new_aparts SET price='11000000' WHERE new_apart_id=1"))
    await seed_apart(db, new_apart_id=2, price="9000000")
    await db.execute(text("UPDATE new_aparts SET price='9500000' WHERE new_apart_id=2"))
    await db.commit()
    r = await client.get("/aparts", params={"price_drop_only": "true"})
    assert {x["new_apart_id"] for x in r.json()} == {1}


async def test_discount_only_and_q(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, address="ул. Лесная 3", price_with_discount="9000000")
    await seed_apart(db, new_apart_id=2, address="ул. Морская 7")
    await db.commit()
    assert {x["new_apart_id"] for x in (await client.get("/aparts", params={"discount_only": "true"})).json()} == {1}
    assert {x["new_apart_id"] for x in (await client.get("/aparts", params={"q": "Морская"})).json()} == {2}
```

- [ ] **Step 2: Run**

Run: `uv run pytest tests/test_aparts_endpoint.py -v`
Expected: all PASS. If `test_discount_only_and_q` fails because a bare `seed_apart` insert with `price_with_discount` still needs the history row's discount — note `discount_only` reads `cur.has_discount` (from `new_aparts`), so it passes without history. If `price_drop_only` fails, check the `prev.price_num IS NOT NULL` guard in the SQL.

- [ ] **Step 3: Commit**

```bash
git add tests/test_aparts_endpoint.py src/sql/aparts_table.sql
git commit -m "test: cover /aparts filters

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 8: Favorites endpoints

**Files:**
- Modify: `src/repository.py`, `src/service.py`, `src/schemas.py`, `src/api.py`
- Create: `tests/test_favorites_endpoint.py`

**Interfaces:**
- Produces:
  - `src.repository.add_favorite(*, new_apart_id, session) -> None` (`INSERT ... ON CONFLICT DO NOTHING`)
  - `src.repository.remove_favorite(*, new_apart_id, session) -> None`
  - `src.repository.list_favorites(*, session) -> list[int]`
  - `src.schemas.FavoriteToggleResult` = `{new_apart_id: int, is_favorite: bool}`
  - `MosResService.add_favorite(self, new_apart_id) -> FavoriteToggleResult`, `.remove_favorite(...)`, `.list_favorites() -> list[int]`
  - Routes: `POST /favorites/{new_apart_id}` → `FavoriteToggleResult{is_favorite: True}`; `DELETE /favorites/{new_apart_id}` → `{is_favorite: False}`; `GET /favorites` → `list[int]`.

- [ ] **Step 1: Write `tests/test_favorites_endpoint.py` (failing)**

```python
from tests.conftest import seed_apart, seed_building


async def test_toggle_favorite_idempotent_and_reflected(client, db):
    await seed_building(db)
    apart_id = await seed_apart(db)
    await db.commit()

    r1 = await client.post(f"/favorites/{apart_id}")
    assert r1.status_code == 200 and r1.json() == {"new_apart_id": apart_id, "is_favorite": True}
    r2 = await client.post(f"/favorites/{apart_id}")
    assert r2.json()["is_favorite"] is True  # idempotent

    assert apart_id in (await client.get("/favorites")).json()
    row = next(x for x in (await client.get("/aparts")).json() if x["new_apart_id"] == apart_id)
    assert row["is_favorite"] is True
    assert {x["new_apart_id"] for x in (await client.get("/aparts", params={"favorites_only": "true"})).json()} == {apart_id}

    r3 = await client.delete(f"/favorites/{apart_id}")
    assert r3.json() == {"new_apart_id": apart_id, "is_favorite": False}
    assert apart_id not in (await client.get("/favorites")).json()
```

- [ ] **Step 2: Run — expect failure** (`404` — routes absent)

Run: `uv run pytest tests/test_favorites_endpoint.py -v`

- [ ] **Step 3: Repository functions in `src/repository.py`**

```python
async def add_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("INSERT INTO favorites (new_apart_id) VALUES (:i) ON CONFLICT DO NOTHING"),
        {"i": new_apart_id},
    )


async def remove_favorite(*, new_apart_id: int, session: AsyncSession) -> None:
    await session.execute(
        text("DELETE FROM favorites WHERE new_apart_id = :i"), {"i": new_apart_id}
    )


async def list_favorites(*, session: AsyncSession) -> list[int]:
    result = await session.execute(text("SELECT new_apart_id FROM favorites ORDER BY new_apart_id"))
    return [row[0] for row in result.all()]
```

- [ ] **Step 4: Schema in `src/schemas.py`**

```python
class FavoriteToggleResult(BaseModel):
    new_apart_id: int
    is_favorite: bool
```

- [ ] **Step 5: Service methods in `src/service.py`**

```python
    async def add_favorite(self, new_apart_id: int) -> FavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await add_favorite(new_apart_id=new_apart_id, session=session)
        return FavoriteToggleResult(new_apart_id=new_apart_id, is_favorite=True)

    async def remove_favorite(self, new_apart_id: int) -> FavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await remove_favorite(new_apart_id=new_apart_id, session=session)
        return FavoriteToggleResult(new_apart_id=new_apart_id, is_favorite=False)

    async def list_favorites(self) -> list[int]:
        async with Session() as session:
            return await list_favorites(session=session)
```
Add the three repo fns + `FavoriteToggleResult` to imports.

- [ ] **Step 6: Routes in `src/api.py`**

```python
from src.schemas import FavoriteToggleResult

@app.get("/favorites", tags=["favorites"], response_model=list[int])
async def get_favorites(mosres_service: MosResService = Depends(get_mosres_service)):
    return await mosres_service.list_favorites()


@app.post("/favorites/{new_apart_id}", tags=["favorites"], response_model=FavoriteToggleResult)
async def add_favorite_route(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.add_favorite(new_apart_id)


@app.delete("/favorites/{new_apart_id}", tags=["favorites"], response_model=FavoriteToggleResult)
async def remove_favorite_route(
    new_apart_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.remove_favorite(new_apart_id)
```

Also add `POST` to the CORS `allow_methods` list if not present — it already lists `["GET", "POST"]`; add `"DELETE"`.

- [ ] **Step 7: Run — expect pass**

Run: `uv run pytest tests/test_favorites_endpoint.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ tests/test_favorites_endpoint.py
git commit -m "feat: favorites endpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 9: Building price-dynamics + versions endpoints

**Files:**
- Modify: `src/schemas.py`, `src/api.py`
- Create: `tests/test_buildings_endpoint.py`

**Interfaces:**
- Consumes: `MosResService.get_building_price_dynamics` (Task 4), `.get_buildings_history` (Task 2).
- Produces:
  - `src.schemas.BuildingPricePoint` = `{snapshot_date: date, avg_price_m: Decimal | None, min_price_m: Decimal | None, median_price_m: Decimal | None, apart_count: int}`
  - Route `GET /buildings/{building_id}/price-dynamics` → `list[BuildingPricePoint]`.

- [ ] **Step 1: Write `tests/test_buildings_endpoint.py` (failing)**

```python
from sqlalchemy import text

from src.repository import refresh_building_price_stats
from tests.conftest import seed_apart, seed_building


async def test_price_dynamics_two_points_ordered(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await refresh_building_price_stats(session=db)
    await db.execute(
        text("UPDATE building_price_stats SET snapshot_date = '2026-08-01'")
    )
    await db.execute(text("UPDATE new_aparts SET price_m = '250000' WHERE new_apart_id = 1"))
    await refresh_building_price_stats(session=db)
    await db.commit()

    r = await client.get("/buildings/1/price-dynamics")
    assert r.status_code == 200
    pts = r.json()
    assert [p["snapshot_date"] for p in pts] == sorted(p["snapshot_date"] for p in pts)
    assert len(pts) == 2


async def test_building_versions(client, db):
    bid = await seed_building(db)
    await db.execute(text("UPDATE buildings SET status_code = 'FINISHED' WHERE building_id = :i"), {"i": bid})
    await db.commit()
    r = await client.get(f"/buildings/{bid}/versions")
    assert r.status_code == 200
    assert len(r.json()) >= 1
```

- [ ] **Step 2: Run — expect failure**

Run: `uv run pytest tests/test_buildings_endpoint.py -v`
Expected: `/buildings/1/price-dynamics` → 404.

- [ ] **Step 3: Schema + route**

`src/schemas.py`:
```python
class BuildingPricePoint(BaseModel):
    snapshot_date: datetime.date
    avg_price_m: Decimal | None = None
    min_price_m: Decimal | None = None
    median_price_m: Decimal | None = None
    apart_count: int
```

`src/api.py`:
```python
from src.schemas import BuildingPricePoint

@app.get(
    "/buildings/{building_id}/price-dynamics",
    tags=["buildings"],
    response_model=list[BuildingPricePoint],
)
async def get_building_price_dynamics(
    building_id: int, mosres_service: MosResService = Depends(get_mosres_service)
):
    return await mosres_service.get_building_price_dynamics(building_id)
```

- [ ] **Step 4: Run — expect pass**

Run: `uv run pytest tests/test_buildings_endpoint.py -v`
Expected: PASS.

- [ ] **Step 5: `/update_data` → `refresh_all`**

In `src/api.py` change the existing handler body to `return await mosres_service.refresh_all()`.

- [ ] **Step 6: Full suite**

Run: `uv run pytest -v`
Expected: all green.

- [ ] **Step 7: Update `README.md`, `Makefile`**

`Makefile` — add:
```makefile
test:
	uv run pytest
```
`README.md` — update the API tables: `/aparts` (with query params), `/aparts/{id}/versions`, `/favorites`, `POST|DELETE /favorites/{id}`, `/buildings/{id}/price-dynamics`; add a "Планировщик" section (daily `refresh_all` at `REFRESH_HOUR`, toggle `SCHEDULER_ENABLED`); add a "Тесты" section (`make test`, needs Docker for testcontainers); add a "Фронтенд" pointer to `frontend/README.md`.

- [ ] **Step 8: Commit**

```bash
git add src/ tests/ README.md Makefile
git commit -m "feat: building price-dynamics endpoint, /update_data runs full refresh

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

## Phase 4 — Frontend scaffold + apartments table

### Task 10: Vite + React + shadcn scaffold

**Files:**
- Create: `frontend/` (Vite scaffold), `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/.env.example`, `frontend/README.md`

**Interfaces:**
- Produces:
  - `frontend/src/lib/api.ts`: `apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T>`, `apiPost<T>(path)`, `apiDelete<T>(path)` — all prefix `import.meta.env.VITE_API_URL`.
  - `frontend/src/lib/types.ts`: `ApartRow`, `BuildingPricePoint`, `BuildingRow` TypeScript interfaces matching the Pydantic models (numeric fields typed `number | null`; the API serialises `Decimal` as string — `api.ts` leaves them as-is, components use `Number(x)`).
  - Router with two routes wired in `App.tsx`: `/` → `ApartsPage`, `/buildings/:id` → `BuildingPage` (both placeholder components for now).

- [ ] **Step 1: Scaffold**

Run:
```bash
cd frontend 2>/dev/null || (npm create vite@latest frontend -- --template react-ts && cd frontend)
cd frontend && npm install
npm install @tanstack/react-query @tanstack/react-table recharts react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```
(Use Tailwind v4 with the Vite plugin: add `@tailwindcss/vite` to `vite.config.ts` plugins, put `@import "tailwindcss";` at the top of `src/index.css`.)

- [ ] **Step 2: shadcn init**

Run (in `frontend/`):
```bash
npx shadcn@latest init -d
npx shadcn@latest add table button badge checkbox input card tabs select tooltip sonner
```
Expected: `components.json`, `src/components/ui/*`, path alias `@/*` added to `tsconfig.json` + `vite.config.ts`.

- [ ] **Step 3: `frontend/.env.example`**

```
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 4: `frontend/src/lib/api.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const apiGet = <T>(path: string, params?: Record<string, unknown>) =>
  req<T>(`${path}${qs(params)}`);
export const apiPost = <T>(path: string) => req<T>(path, { method: "POST" });
export const apiDelete = <T>(path: string) => req<T>(path, { method: "DELETE" });
```

- [ ] **Step 5: `frontend/src/lib/types.ts`**

```ts
export interface ApartRow {
  new_apart_id: number;
  address: string | null;
  building: string | null;
  building_id: string | null;
  number: string | null;
  rooms: string | null;
  floor: string | null;
  area: string | null;
  price: string | null;
  price_prev: string | null;
  price_delta_prev: string | null;
  price_delta_prev_pct: string | null;
  price_max: string | null;
  price_delta_max_pct: string | null;
  has_discount: boolean;
  discount_is_new: boolean;
  discount_pct: string | null;
  is_favorite: boolean;
  mosres_url: string;
  updated_at: string;
}

export interface BuildingPricePoint {
  snapshot_date: string;
  avg_price_m: string | null;
  min_price_m: string | null;
  median_price_m: string | null;
  apart_count: number;
}

export interface BuildingRow {
  building_id: number;
  address: string | null;
  status_code: string;
  finishing_code: string | null;
  metro: string[] | null;
  vvod: string | null;
}
```

- [ ] **Step 6: `frontend/src/App.tsx` + `main.tsx`**

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ApartsPage } from "@/pages/ApartsPage";
import { BuildingPage } from "@/pages/BuildingPage";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ApartsPage />} />
          <Route path="/buildings/:id" element={<BuildingPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
```
Create placeholder `src/pages/ApartsPage.tsx` (`export function ApartsPage() { return <div>aparts</div>; }`) and `src/pages/BuildingPage.tsx`.

- [ ] **Step 7: Verify build**

Run: `cd frontend && npm run build`
Expected: succeeds, `dist/` produced.

- [ ] **Step 8: `frontend/README.md`**

Document: `npm install`, copy `.env.example` → `.env`, `npm run dev` (needs API on `VITE_API_URL`), `npm run build`.

- [ ] **Step 9: Commit**

```bash
git add frontend/ .gitignore
git commit -m "feat(frontend): Vite + React + shadcn scaffold with API client and router

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```
(Ensure `frontend/node_modules` and `frontend/dist` are git-ignored.)

---

### Task 11: Apartments table component

**Files:**
- Create: `frontend/src/hooks/useAparts.ts`, `frontend/src/components/PriceCell.tsx`, `frontend/src/components/DiscountCell.tsx`, `frontend/src/components/ApartsTable.tsx`
- Modify: `frontend/src/pages/ApartsPage.tsx`

**Interfaces:**
- Consumes: `apiGet`, `ApartRow`.
- Produces:
  - `useAparts(filters: ApartFilters)` → `UseQueryResult<ApartRow[]>`, query key `["aparts", filters]`, where `ApartFilters = { building_id?: number; favorites_only?: boolean; discount_only?: boolean; price_drop_only?: boolean; q?: string }`.
  - `<ApartsTable rows={ApartRow[]} onToggleFavorite={(id: number, next: boolean) => void} />` — TanStack Table, sortable columns, price-drop row highlight.

- [ ] **Step 1: `useAparts.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ApartRow } from "@/lib/types";

export interface ApartFilters {
  building_id?: number;
  favorites_only?: boolean;
  discount_only?: boolean;
  price_drop_only?: boolean;
  q?: string;
}

export function useAparts(filters: ApartFilters) {
  return useQuery({
    queryKey: ["aparts", filters],
    queryFn: () => apiGet<ApartRow[]>("/aparts", filters as Record<string, unknown>),
  });
}
```

- [ ] **Step 2: `PriceCell.tsx`**

```tsx
export function money(v: string | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("ru-RU").format(Number(v)) + " ₽";
}

export function PriceDelta({ abs, pct }: { abs: string | null; pct: string | null }) {
  if (abs === null || pct === null) return <span className="text-muted-foreground">—</span>;
  const n = Number(abs);
  const cls = n < 0 ? "text-red-600" : n > 0 ? "text-green-600" : "text-muted-foreground";
  const sign = n > 0 ? "+" : "";
  return (
    <span className={cls}>
      {sign}
      {new Intl.NumberFormat("ru-RU").format(n)} ₽ ({sign}
      {pct}%)
    </span>
  );
}
```

- [ ] **Step 3: `DiscountCell.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { ApartRow } from "@/lib/types";

export function DiscountCell({ row }: { row: ApartRow }) {
  if (!row.has_discount) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1">
      <Badge variant="secondary">
        −{row.discount_pct ? `${row.discount_pct}%` : "скидка"}
      </Badge>
      {row.discount_is_new && <Badge>NEW</Badge>}
    </div>
  );
}
```

- [ ] **Step 4: `ApartsTable.tsx`** (TanStack Table)

Component:
```tsx
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ApartRow } from "@/lib/types";
import { PriceDelta, money } from "./PriceCell";
import { DiscountCell } from "./DiscountCell";

const col = createColumnHelper<ApartRow>();

export function ApartsTable({
  rows,
  onToggleFavorite,
}: {
  rows: ApartRow[];
  onToggleFavorite: (id: number, next: boolean) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = [
    col.accessor("is_favorite", {
      header: "★",
      cell: (c) => (
        <button
          onClick={() => onToggleFavorite(c.row.original.new_apart_id, !c.getValue())}
          aria-label="favorite"
        >
          <Star className={c.getValue() ? "fill-yellow-400 stroke-yellow-500" : "stroke-muted-foreground"} size={16} />
        </button>
      ),
    }),
    col.accessor("address", { header: "Адрес" }),
    col.accessor("building", {
      header: "Дом",
      cell: (c) =>
        c.row.original.building_id ? (
          <Link className="underline" to={`/buildings/${c.row.original.building_id}`}>
            {c.getValue()}
          </Link>
        ) : (
          c.getValue()
        ),
    }),
    col.accessor("number", { header: "№" }),
    col.accessor("rooms", { header: "Комн." }),
    col.accessor("floor", { header: "Этаж" }),
    col.accessor("area", { header: "S, м²" }),
    col.accessor("price", { header: "Цена", cell: (c) => money(c.getValue()) }),
    col.display({
      id: "delta_prev",
      header: "Δ пред.",
      cell: (c) => (
        <PriceDelta abs={c.row.original.price_delta_prev} pct={c.row.original.price_delta_prev_pct} />
      ),
    }),
    col.accessor("price_delta_max_pct", {
      header: "Δ макс.",
      cell: (c) => (c.getValue() === null ? "—" : <span className="text-red-600">{c.getValue()}%</span>),
    }),
    col.display({ id: "discount", header: "Скидка", cell: (c) => <DiscountCell row={c.row.original} /> }),
    col.display({
      id: "link",
      header: "",
      cell: (c) => (
        <a href={c.row.original.mosres_url} target="_blank" rel="noreferrer" aria-label="источник">
          <ExternalLink size={16} />
        </a>
      ),
    }),
    col.accessor("updated_at", {
      header: "Обновлено",
      cell: (c) => new Date(c.getValue()).toLocaleDateString("ru-RU"),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => (
              <TableHead key={h.id} onClick={h.column.getToggleSortingHandler()} className="cursor-pointer select-none">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((r) => {
          const drop = r.original.price_delta_prev !== null && Number(r.original.price_delta_prev) < 0;
          return (
            <TableRow key={r.id} className={drop ? "bg-red-50 dark:bg-red-950/30" : undefined}>
              {r.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 5: Minimal `ApartsPage.tsx`**

```tsx
import { useAparts } from "@/hooks/useAparts";
import { ApartsTable } from "@/components/ApartsTable";

export function ApartsPage() {
  const { data, isLoading, error } = useAparts({});
  if (isLoading) return <div className="p-6">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {String(error)}</div>;
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Квартиры</h1>
      <ApartsTable rows={data ?? []} onToggleFavorite={() => {}} />
    </div>
  );
}
```

- [ ] **Step 6: Manual check**

Run backend (`uv run uvicorn src.api:app --reload`, seed some data via `/update_data` or manual insert), then `cd frontend && npm run dev`. Open `http://localhost:5173`, confirm the table renders rows, sorting works, price-drop rows highlight, external link opens москварталы.рф.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): apartments table with price deltas, discount badges, source link

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 12: Favorites toggle + toolbar filters + refresh button

**Files:**
- Create: `frontend/src/hooks/useFavorites.ts`, `frontend/src/hooks/useBuildings.ts`, `frontend/src/components/ApartsToolbar.tsx`
- Modify: `frontend/src/pages/ApartsPage.tsx`

**Interfaces:**
- Produces:
  - `useToggleFavorite()` → mutation `{ mutate({ id, next }) }` calling `POST`/`DELETE /favorites/{id}`, optimistic update of every `["aparts", *]` query, rollback on error, `invalidateQueries(["aparts"])` on settle.
  - `useBuildings()` → `BuildingRow[]` from `GET /buildings`.
  - `useRefreshData()` → mutation calling `GET /update_data`, on success `invalidateQueries()` + `toast.success`.
  - `<ApartsToolbar value={ApartFilters} onChange={(f: ApartFilters) => void} />`.

- [ ] **Step 1: `useFavorites.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "@/lib/api";
import type { ApartRow } from "@/lib/types";

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      next ? apiPost(`/favorites/${id}`) : apiDelete(`/favorites/${id}`),
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: ["aparts"] });
      const snapshots = qc.getQueriesData<ApartRow[]>({ queryKey: ["aparts"] });
      for (const [key, rows] of snapshots) {
        if (!rows) continue;
        qc.setQueryData<ApartRow[]>(
          key,
          rows.map((r) => (r.new_apart_id === id ? { ...r, is_favorite: next } : r)),
        );
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, rows]) => qc.setQueryData(key, rows));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["aparts"] }),
  });
}
```

- [ ] **Step 2: `useBuildings.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BuildingRow } from "@/lib/types";

export const useBuildings = () =>
  useQuery({ queryKey: ["buildings"], queryFn: () => apiGet<BuildingRow[]>("/buildings") });
```

- [ ] **Step 3: `useRefreshData` (in `useFavorites.ts` or a new `useRefresh.ts`)**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

export function useRefreshData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiGet("/update_data"),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Данные обновлены");
    },
    onError: (e) => toast.error(`Не удалось обновить: ${String(e)}`),
  });
}
```

- [ ] **Step 4: `ApartsToolbar.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBuildings } from "@/hooks/useBuildings";
import { useRefreshData } from "@/hooks/useRefresh";
import type { ApartFilters } from "@/hooks/useAparts";

export function ApartsToolbar({
  value,
  onChange,
}: {
  value: ApartFilters;
  onChange: (f: ApartFilters) => void;
}) {
  const buildings = useBuildings();
  const refresh = useRefreshData();
  const set = (patch: Partial<ApartFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        placeholder="Поиск по адресу / дому / №"
        defaultValue={value.q ?? ""}
        onChange={(e) => set({ q: e.target.value || undefined })}
        className="w-64"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.favorites_only}
          onCheckedChange={(c) => set({ favorites_only: !!c || undefined })}
        />
        только избранное
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.discount_only}
          onCheckedChange={(c) => set({ discount_only: !!c || undefined })}
        />
        со скидкой
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.price_drop_only}
          onCheckedChange={(c) => set({ price_drop_only: !!c || undefined })}
        />
        с падением цены
      </label>
      <Select
        value={value.building_id ? String(value.building_id) : "all"}
        onValueChange={(v) => set({ building_id: v === "all" ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-56"><SelectValue placeholder="Дом" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все дома</SelectItem>
          {(buildings.data ?? []).map((b) => (
            <SelectItem key={b.building_id} value={String(b.building_id)}>
              {b.address ?? `Дом ${b.building_id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
      >
        {refresh.isPending ? "Обновление…" : "Обновить данные"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Wire `ApartsPage.tsx`**

```tsx
import { useState } from "react";
import { useAparts, type ApartFilters } from "@/hooks/useAparts";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { ApartsTable } from "@/components/ApartsTable";
import { ApartsToolbar } from "@/components/ApartsToolbar";

export function ApartsPage() {
  const [filters, setFilters] = useState<ApartFilters>({});
  const { data, isLoading, error } = useAparts(filters);
  const toggle = useToggleFavorite();
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Квартиры</h1>
      <ApartsToolbar value={filters} onChange={setFilters} />
      {isLoading && <div>Загрузка…</div>}
      {error && <div className="text-red-600">Ошибка: {String(error)}</div>}
      {data && (
        <ApartsTable
          rows={data}
          onToggleFavorite={(id, next) => toggle.mutate({ id, next })}
        />
      )}
    </div>
  );
}
```

Add a debounce to the search input (e.g. a small `useDebouncedValue` hook, 300 ms) so each keystroke doesn't refetch — put the hook in `frontend/src/hooks/useDebouncedValue.ts`:
```ts
import { useEffect, useState } from "react";
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
```
Apply it in `ApartsPage` to the `q` field before passing `filters` to `useAparts`.

- [ ] **Step 6: Manual check**

`npm run dev` + backend running. Toggle a star → optimistic, persists after refetch. Each checkbox filters. Building select filters. "Обновить данные" shows toast and refreshes.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): favorites toggle, filter toolbar, refresh button

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

## Phase 5 — Building screen

### Task 13: Building page + price-dynamics chart

**Files:**
- Create: `frontend/src/hooks/useBuilding.ts`, `frontend/src/components/BuildingPriceChart.tsx`
- Modify: `frontend/src/pages/BuildingPage.tsx`

**Interfaces:**
- Produces:
  - `useBuildingPriceDynamics(id: number)` → `BuildingPricePoint[]` from `GET /buildings/{id}/price-dynamics`.
  - `useBuilding(id: number)` → single `BuildingRow` (filter the `useBuildings()` list client-side; no dedicated endpoint).
  - `<BuildingPriceChart points={BuildingPricePoint[]} />` — Recharts line chart, metric switch (`avg` / `min` / `median`) via shadcn `Tabs`.

- [ ] **Step 1: `useBuilding.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BuildingPricePoint, BuildingRow } from "@/lib/types";

export const useBuildingPriceDynamics = (id: number) =>
  useQuery({
    queryKey: ["price-dynamics", id],
    queryFn: () => apiGet<BuildingPricePoint[]>(`/buildings/${id}/price-dynamics`),
  });

export function useBuilding(id: number) {
  return useQuery({
    queryKey: ["building", id],
    queryFn: async () => {
      const all = await apiGet<BuildingRow[]>("/buildings");
      return all.find((b) => b.building_id === id) ?? null;
    },
  });
}
```

- [ ] **Step 2: `BuildingPriceChart.tsx`**

```tsx
import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BuildingPricePoint } from "@/lib/types";

const METRICS = {
  avg_price_m: "Средняя",
  min_price_m: "Минимальная",
  median_price_m: "Медиана",
} as const;
type MetricKey = keyof typeof METRICS;

export function BuildingPriceChart({ points }: { points: BuildingPricePoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("avg_price_m");
  const data = points.map((p) => ({
    date: p.snapshot_date,
    value: p[metric] === null ? null : Number(p[metric]),
  }));

  return (
    <div>
      <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
        <TabsList>
          {Object.entries(METRICS).map(([k, label]) => (
            <TabsTrigger key={k} value={k}>{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => new Intl.NumberFormat("ru-RU").format(v)} width={80} />
            <Tooltip formatter={(v: number) => new Intl.NumberFormat("ru-RU").format(v) + " ₽/м²"} />
            <Line type="monotone" dataKey="value" stroke="currentColor" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `BuildingPage.tsx`**

```tsx
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBuilding, useBuildingPriceDynamics } from "@/hooks/useBuilding";
import { BuildingPriceChart } from "@/components/BuildingPriceChart";

export function BuildingPage() {
  const id = Number(useParams().id);
  const building = useBuilding(id);
  const dynamics = useBuildingPriceDynamics(id);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{building.data?.address ?? `Дом ${id}`}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Статус: {building.data?.status_code ?? "—"} · Ввод: {building.data?.vvod ?? "—"} ·
          Метро: {building.data?.metro?.join(", ") ?? "—"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Динамика цены за м²</CardTitle></CardHeader>
        <CardContent>
          {dynamics.isLoading && <div>Загрузка…</div>}
          {dynamics.data && dynamics.data.length === 0 && (
            <div className="text-sm text-muted-foreground">Ещё нет снимков цены.</div>
          )}
          {dynamics.data && dynamics.data.length > 0 && (
            <BuildingPriceChart points={dynamics.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manual check**

Navigate from a building link in the table to `/buildings/:id`. Header shows data. If `building_price_stats` has ≥2 rows (run `/update_data` on two different days, or manually insert), chart renders and the metric tabs switch series.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): building page with price-dynamics chart

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

### Task 14: Reuse apartments table on building page + versions tab

**Files:**
- Modify: `frontend/src/pages/BuildingPage.tsx`
- Create: `frontend/src/hooks/useBuildingVersions.ts`

**Interfaces:**
- Consumes: `useAparts` (Task 11) with `{ building_id }`, `useToggleFavorite` (Task 12).
- Produces: `useBuildingVersions(id)` → history rows from `GET /buildings/{id}/versions`.

- [ ] **Step 1: Add the filtered table to `BuildingPage.tsx`**

```tsx
import { useAparts } from "@/hooks/useAparts";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { ApartsTable } from "@/components/ApartsTable";
// ...inside component:
const aparts = useAparts({ building_id: id });
const toggle = useToggleFavorite();
// ...in JSX, another Card:
<Card>
  <CardHeader><CardTitle>Квартиры дома</CardTitle></CardHeader>
  <CardContent>
    {aparts.data && (
      <ApartsTable rows={aparts.data} onToggleFavorite={(aid, next) => toggle.mutate({ id: aid, next })} />
    )}
  </CardContent>
</Card>
```

- [ ] **Step 2: `useBuildingVersions.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export const useBuildingVersions = (id: number) =>
  useQuery({
    queryKey: ["building-versions", id],
    queryFn: () => apiGet<Record<string, unknown>[]>(`/buildings/${id}/versions`),
  });
```

- [ ] **Step 3: Optional versions `Tabs` on the page**

Wrap the price chart Card and a "История дома" Card in shadcn `Tabs` (`TabsList` with "Цена" / "История"). History content: a plain shadcn `Table` over `useBuildingVersions(id)` showing `version`, `updated_at`, `status_code`, `finishing_code`. Keep it minimal — data is a loose record; render `version`, `updated_at`, and any changed status fields.

- [ ] **Step 4: Full manual pass**

- Table `/` renders, sorts, filters, favorites toggle persists.
- Building link → `/buildings/:id` → header + chart + filtered apartments table + versions.
- `npm run build` succeeds.

- [ ] **Step 5: Full backend suite still green**

Run: `uv run pytest -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): reuse apartments table and building history on building page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VHKqK4SMTDQMQhBPhuKWYK"
```

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| Trigger guard `IS DISTINCT FROM`, new migration | Task 1 |
| Fix `MosResService` `self`, `api` return, `repository.get_new_aparts_table`, raw SQL file | Task 2 |
| Delete/repair dead code | Task 2 (deletes `src/client.py`) |
| `favorites` table | Task 3 |
| `building_price_stats` table + upsert query | Task 3 (table), Task 4 (query) |
| APScheduler daily job, lifespan | Task 5 |
| `refresh_all()` | Task 4 |
| `GET /aparts` computed fields | Task 6 |
| `/aparts` filters | Task 7 |
| `GET /aparts/{id}/versions` fixed | Task 2 |
| `POST/DELETE /favorites/{id}`, `GET /favorites` | Task 8 |
| `GET /buildings` fixed | Task 2 |
| `GET /buildings/{id}/price-dynamics` | Task 9 |
| `GET /buildings/{id}/versions` fixed | Task 2 (fix), Task 9 (test) |
| `/update_data` → `refresh_all` | Task 9 |
| testcontainers test infra | Task 1 |
| Versioning / aggregate / favorites / price-dynamics tests | Tasks 1, 6, 7, 8, 9 |
| Frontend `frontend/` Vite+React+TS+shadcn | Task 10 |
| Apartments table: ★, address, building link, price, Δ prev, Δ max, discount badges, source link, updated | Task 11 |
| Toolbar: search, favorites/discount/price-drop checkboxes, building select, refresh button | Task 12 |
| Price-drop row highlight | Task 11 |
| Building page: header card + Recharts chart with metric switch | Task 13 |
| Reuse apartments table filtered by building + versions | Task 14 |
| README / Makefile updates | Task 9 |

No gaps.

**2. Placeholder scan**

One deliberate transient stub: Task 2 Step 7 (`get_aparts_table` returns `[]`) — explicitly replaced and tested in Task 6. Everything else ships real code. `downgrade()` bodies for the two migrations are intentionally `pass` (forward-only trigger-body change; noted in Task 1 Step 9).

**3. Type / name consistency**

- Repository read helpers are keyword-only everywhere they're called (`session=`, `new_apart_id=`, `building_id=`).
- `ApartRow` field names match `aparts_table.sql` output columns exactly (`price`, `price_prev`, `price_delta_prev`, `price_delta_prev_pct`, `price_max`, `price_delta_max_pct`, `has_discount`, `discount_is_new`, `discount_pct`, `is_favorite`, `mosres_url`, `updated_at`).
- `FavoriteToggleResult` shape (`{new_apart_id, is_favorite}`) matches the tests in Task 8.
- `BuildingPricePoint` matches `get_building_price_dynamics` columns.
- **Frontend component names:** canonical spelling `Aparts*` everywhere — `ApartsTable`, `ApartsPage`, `ApartsToolbar`; files `ApartsTable.tsx`, `ApartsPage.tsx`, `ApartsToolbar.tsx`; route element `<ApartsPage />`.
- `useAparts` returns `ApartRow[]`; `ApartFilters` keys match `/aparts` query params (`building_id`, `favorites_only`, `discount_only`, `price_drop_only`, `q`).
- Query keys: `["aparts", filters]` (invalidated by favorites + refresh mutations), `["buildings"]`, `["price-dynamics", id]`, `["building", id]`, `["building-versions", id]`.

No issues outstanding.
