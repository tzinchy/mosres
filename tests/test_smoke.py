from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def test_buildings_endpoint_returns_rows(client, db):
    await seed_building(db)
    await db.commit()
    r = await client.get("/buildings")
    assert r.status_code == 200
    assert any(row["building_id"] == 1 for row in r.json())


async def test_apart_versions_endpoint_returns_history(client, db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET price = '9000000' WHERE new_apart_id = :i"),
        {"i": apart_id},
    )
    await db.commit()
    r = await client.get(f"/aparts/{apart_id}/versions")
    assert r.status_code == 200
    assert [row["version"] for row in r.json()] == [1, 2]
