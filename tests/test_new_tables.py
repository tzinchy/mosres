import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


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
    with pytest.raises(IntegrityError):
        await db.execute(
            text(
                "INSERT INTO building_price_stats (building_id, snapshot_date, apart_count) "
                "VALUES (1, '2026-09-01', 5)"
            )
        )
