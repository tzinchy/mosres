from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _seed(db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, rooms="1", price="9000000", price_m="200000")
    await seed_apart(db, new_apart_id=2, rooms="2", price="12000000", price_m="250000")
    await seed_apart(
        db, new_apart_id=3, rooms="2", price="15000000", price_m="300000", reserve=1
    )
    await seed_apart(db, new_apart_id=4, rooms="0", price="7000000", price_m="180000")
    await db.commit()


async def test_pivot_by_rooms_count(client, db):
    await _seed(db)
    r = await client.get(
        "/dashboard/pivot", params={"dimension": "rooms", "metric": "count"}
    )
    assert r.status_code == 200
    got = {p["key"]: p["value"] for p in r.json()}
    assert got == {"1-комн": 1, "2-комн": 2, "Студия": 1}


async def test_pivot_by_rooms_avg_price(client, db):
    await _seed(db)
    got = {
        p["key"]: p["value"]
        for p in (
            await client.get(
                "/dashboard/pivot",
                params={"dimension": "rooms", "metric": "avg_price"},
            )
        ).json()
    }
    assert got["2-комн"] == 13500000  # (12M + 15M) / 2


async def test_pivot_by_date_reserved(client, db):
    await _seed(db)
    pts = (
        await client.get(
            "/dashboard/pivot", params={"dimension": "date", "metric": "reserved"}
        )
    ).json()
    assert pts[-1]["value"] == 1  # apart 3 is reserved today


async def test_pivot_rejects_unknown_dimension(client):
    r = await client.get(
        "/dashboard/pivot", params={"dimension": "colour", "metric": "count"}
    )
    assert r.status_code == 422


async def test_pivot_rejects_unknown_metric(client):
    r = await client.get(
        "/dashboard/pivot", params={"dimension": "rooms", "metric": "vibes"}
    )
    assert r.status_code == 422
