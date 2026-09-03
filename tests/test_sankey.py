from tests.conftest import seed_apart, seed_building


async def test_sankey_groups_by_district_rooms_bucket(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, rooms="2", price="12000000")
    await seed_apart(db, new_apart_id=2, rooms="2", price="12500000")  # same cell
    await seed_apart(db, new_apart_id=3, rooms="3", price="45000000")
    await db.commit()

    rows = (await client.get("/dashboard/sankey")).json()
    cell = {(r["rooms"], r["bucket"]): r["count"] for r in rows}
    assert cell[("2-комн", "10–15 млн")] == 2
    assert cell[("3-комн", "30–50 млн")] == 1
    assert all(r["district"] == "Прочие" for r in rows)  # seeded county unknown
    assert sum(r["count"] for r in rows) == 3
