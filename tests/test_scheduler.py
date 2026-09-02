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


def test_build_scheduler_registers_periodic_job():
    from src.scheduler import build_scheduler

    scheduler = build_scheduler()
    job = scheduler.get_job("periodic-refresh")
    assert job is not None
    assert job.max_instances == 1
