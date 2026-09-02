from sqlalchemy import text

from src.repository import refresh_building_price_stats
from tests.conftest import seed_apart, seed_building


async def test_price_dynamics_two_points_ordered(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await refresh_building_price_stats(session=db)
    await db.execute(text("UPDATE building_price_stats SET snapshot_date = '2026-08-01'"))
    await db.execute(text("UPDATE new_aparts SET price_m = '250000' WHERE new_apart_id = 1"))
    await refresh_building_price_stats(session=db)
    await db.commit()

    r = await client.get("/buildings/1/price-dynamics")
    assert r.status_code == 200
    pts = r.json()
    assert len(pts) == 2
    assert [p["snapshot_date"] for p in pts] == sorted(p["snapshot_date"] for p in pts)


async def test_building_versions(client, db):
    bid = await seed_building(db)
    await db.execute(
        text("UPDATE buildings SET status_code = 'FINISHED' WHERE building_id = :i"),
        {"i": bid},
    )
    await db.commit()
    r = await client.get(f"/buildings/{bid}/versions")
    assert r.status_code == 200
    assert len(r.json()) >= 1
