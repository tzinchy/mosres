from tests.conftest import seed_apart, seed_building


async def test_scatter_returns_apart_points(client, db):
    await seed_building(db)
    await seed_apart(
        db,
        new_apart_id=1,
        area="55.5",
        price="12000000",
        price_m="216000",
        rooms="2",
    )
    await seed_apart(db, new_apart_id=2, area="", price="9000000")  # no area
    await seed_apart(db, new_apart_id=3, area="40", price="")  # no price
    await db.commit()

    rows = (await client.get("/dashboard/scatter")).json()
    assert [r["new_apart_id"] for r in rows] == [1]
    p = rows[0]
    assert p["area"] == 55.5
    assert p["price"] == 12000000
    assert p["rooms"] == "2-комн"
    assert p["district"] == "Прочие"  # seeded county has no districts row


async def test_scatter_favorites_only(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, area="50", price="10000000")
    await seed_apart(db, new_apart_id=2, area="60", price="12000000")
    await db.commit()
    await client.post("/favorites/2")

    rows = (
        await client.get("/dashboard/scatter", params={"favorites_only": "true"})
    ).json()
    assert [r["new_apart_id"] for r in rows] == [2]
