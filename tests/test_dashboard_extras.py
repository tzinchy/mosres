import io

import pandas as pd
from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def test_timeseries_returns_a_row_per_day(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1)
    await db.commit()
    r = await client.get("/dashboard/timeseries", params={"days": 7})
    assert r.status_code == 200
    pts = r.json()
    assert len(pts) == 7
    assert pts[-1]["new_aparts"] >= 1  # seeded today


async def test_buildings_stats(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, price_m="200000", reserve=1)
    await seed_apart(
        db, new_apart_id=2, price_m="300000", price="10000000",
        price_with_discount="9000000",
    )
    await db.commit()
    r = await client.get("/buildings/stats")
    b = next(x for x in r.json() if x["building_id"] == 1)
    assert b["aparts"] == 2
    assert b["avg_price_m"] == 250000
    assert b["reserved"] == 1
    assert b["with_discount"] == 1


async def test_zero_discount_is_not_a_discount(client, db):
    await seed_building(db)
    await seed_apart(
        db, new_apart_id=1, price="9000000",
        price_with_discount="0", percentage_discount="0",
    )
    await db.commit()
    row = next(x for x in (await client.get("/aparts")).json() if x["new_apart_id"] == 1)
    assert row["has_discount"] is False
    assert row["discount_pct"] is None
    assert row["price_m"] is not None


async def test_excel_export_favorites_only(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1)
    await seed_apart(db, new_apart_id=2)
    await db.commit()
    await client.post("/favorites/1")

    r = await client.get("/file", params={"favorites_only": "true"})
    assert r.status_code == 200
    assert "favorites" in r.headers["content-disposition"]
    frame = pd.read_excel(io.BytesIO(r.content))
    assert list(frame["ID"]) == [1]
