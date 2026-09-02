from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def test_notifications_only_for_favorites_and_real_changes(client, db):
    await seed_building(db, building_id=1)
    await seed_building(db, building_id=2, code="b2")
    fav = await seed_apart(db, new_apart_id=1, building_id="1", price="12000000")
    await seed_apart(db, new_apart_id=2, building_id="2", price="9000000")
    # favorited apart: price drop + discount
    await db.execute(
        text(
            "UPDATE new_aparts SET price='11000000', price_with_discount='10500000' "
            "WHERE new_apart_id=1"
        )
    )
    # non-favorited apart changes — must not show up
    await db.execute(text("UPDATE new_aparts SET price='8000000' WHERE new_apart_id=2"))
    await db.commit()
    await client.post(f"/favorites/{fav}")

    r = await client.get("/notifications")
    assert r.status_code == 200
    events = r.json()
    assert all(e["new_apart_id"] == 1 for e in events)
    latest = events[0]
    assert latest["price_down"] is True
    assert latest["discount_new"] is True
    assert latest["price"] == 11000000


async def test_metro_stats(client, db):
    await db.execute(
        text("INSERT INTO metros (metro_id, name, color) VALUES (5, 'Юго-Западная', '#f00')")
    )
    await seed_building(db, building_id=1, metro=["5"])
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await seed_apart(
        db, new_apart_id=2, building_id="1", price_m="240000",
        price="10000000", price_with_discount="9000000",
    )
    await db.commit()
    r = await client.get("/dashboard/metro")
    row = next(x for x in r.json() if x["metro_id"] == 5)
    assert row["aparts"] == 2
    assert row["with_discount"] == 1
    assert row["avg_price_m"] == 220000


async def test_price_and_discount_filters(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, price="8000000")
    await seed_apart(db, new_apart_id=2, price="12000000")
    await seed_apart(
        db, new_apart_id=3, price="20000000", price_with_discount="17000000",
    )
    await db.commit()
    ids = lambda r: {x["new_apart_id"] for x in r.json()}
    assert ids(await client.get("/aparts", params={"min_price": 10000000})) == {2, 3}
    assert ids(await client.get("/aparts", params={"max_price": 10000000})) == {1}
    assert ids(await client.get("/aparts", params={"min_discount": 10})) == {3}
