from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _prep_three_versions(db):
    await seed_building(db)
    apart_id = await seed_apart(db, price="12000000")
    await db.execute(
        text("UPDATE new_aparts SET price = '13000000' WHERE new_apart_id = :i"),
        {"i": apart_id},
    )
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


async def test_building_id_filter(client, db):
    await seed_building(db, building_id=1)
    await seed_building(db, building_id=2, code="b2")
    await seed_apart(db, new_apart_id=1, building_id="1")
    await seed_apart(db, new_apart_id=2, building_id="2")
    await db.commit()
    r = await client.get("/aparts", params={"building_id": 2})
    assert {x["new_apart_id"] for x in r.json()} == {2}


async def test_price_drop_only_filter(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, price="12000000")
    await db.execute(text("UPDATE new_aparts SET price='11000000' WHERE new_apart_id=1"))
    await seed_apart(db, new_apart_id=2, price="9000000")
    await db.execute(text("UPDATE new_aparts SET price='9500000' WHERE new_apart_id=2"))
    await db.commit()
    r = await client.get("/aparts", params={"price_drop_only": "true"})
    assert {x["new_apart_id"] for x in r.json()} == {1}


async def test_reserve_family_metro_plan_fields(client, db):
    await seed_building(db, metro=["Тёплый Стан"], family_hypotec=1)
    await seed_apart(
        db,
        new_apart_id=1,
        reserve=1,
        property="Стандартная, семейная",
        plan_s="/upload/resize_cache/x.png",
        tour_3d="/upload/3dtours/1/Tour.html",
    )
    await db.commit()
    row = next(x for x in (await client.get("/aparts")).json() if x["new_apart_id"] == 1)
    assert row["reserve"] == 1
    assert row["is_family"] is True
    assert row["metro"] == ["Тёплый Стан"]
    assert row["family_hypotec"] == 1
    assert row["plan_url"] == "https://xn--80aae5aibotfo5h.xn--p1ai/upload/resize_cache/x.png"
    assert row["tour_3d_url"].endswith("/Tour.html")


async def test_building_ids_and_reserved_family_filters(client, db):
    await seed_building(db, building_id=1)
    await seed_building(db, building_id=2, code="b2")
    await seed_apart(db, new_apart_id=1, building_id="1", reserve=1, property="семейная")
    await seed_apart(db, new_apart_id=2, building_id="2", reserve=0, property="Стандартная")
    await db.commit()
    r_ids = await client.get("/aparts", params={"building_ids": "1"})
    assert {x["new_apart_id"] for x in r_ids.json()} == {1}
    r_res = await client.get("/aparts", params={"reserved_only": "true"})
    assert {x["new_apart_id"] for x in r_res.json()} == {1}
    r_fam = await client.get("/aparts", params={"family_only": "true"})
    assert {x["new_apart_id"] for x in r_fam.json()} == {1}


async def test_discount_only_and_q(client, db):
    await seed_building(db)
    await seed_apart(
        db, new_apart_id=1, address="ул. Лесная 3", price_with_discount="9000000"
    )
    await seed_apart(db, new_apart_id=2, address="ул. Морская 7")
    await db.commit()
    r_disc = await client.get("/aparts", params={"discount_only": "true"})
    assert {x["new_apart_id"] for x in r_disc.json()} == {1}
    r_q = await client.get("/aparts", params={"q": "Морская"})
    assert {x["new_apart_id"] for x in r_q.json()} == {2}
