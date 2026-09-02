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
