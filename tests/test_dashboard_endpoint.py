from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def test_dashboard_counts_today_changes(client, db):
    await seed_building(db)
    # one brand-new apart today (version 1)
    await seed_apart(db, new_apart_id=1, price="10000000")
    # one that drops price today
    await seed_apart(db, new_apart_id=2, price="12000000")
    await db.execute(text("UPDATE new_aparts SET price='11000000' WHERE new_apart_id=2"))
    # one that gains a discount today
    await seed_apart(db, new_apart_id=3, price="9000000")
    await db.execute(
        text("UPDATE new_aparts SET price_with_discount='8500000' WHERE new_apart_id=3")
    )
    # one that goes into reserve today
    await seed_apart(db, new_apart_id=4, price="7000000", reserve=0)
    await db.execute(text("UPDATE new_aparts SET reserve=1 WHERE new_apart_id=4"))
    await db.commit()

    r = await client.get("/dashboard")
    assert r.status_code == 200
    m = r.json()
    assert m["aparts_total"] == 4
    assert m["new_today"] == 4
    assert m["changed_today"] == 3  # drop + discount + reserve
    assert m["price_drops_today"] == 1
    assert m["discounts_appeared_today"] == 1
    assert m["reserved_today"] == 1


async def test_dashboard_favorites_only_scopes(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1)
    await seed_apart(db, new_apart_id=2)
    await db.commit()
    await client.post("/favorites/1")

    all_m = (await client.get("/dashboard")).json()
    fav_m = (await client.get("/dashboard", params={"favorites_only": "true"})).json()
    assert all_m["aparts_total"] == 2
    assert fav_m["aparts_total"] == 1
    assert fav_m["favorites_total"] == 1


async def test_status_reports_last_refresh(client, db):
    await db.execute(text("INSERT INTO refresh_runs (ok) VALUES (true)"))
    await db.commit()
    r = await client.get("/status")
    assert r.status_code == 200
    body = r.json()
    assert body["last_refresh"] is not None
    assert body["interval_minutes"] == 30
