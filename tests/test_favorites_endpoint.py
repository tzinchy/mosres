from tests.conftest import seed_apart, seed_building


async def test_toggle_favorite_idempotent_and_reflected(client, db):
    await seed_building(db)
    apart_id = await seed_apart(db)
    await db.commit()

    r1 = await client.post(f"/favorites/{apart_id}")
    assert r1.status_code == 200
    assert r1.json() == {"new_apart_id": apart_id, "is_favorite": True}
    r2 = await client.post(f"/favorites/{apart_id}")
    assert r2.json()["is_favorite"] is True  # idempotent

    assert apart_id in (await client.get("/favorites")).json()
    row = next(
        x for x in (await client.get("/aparts")).json() if x["new_apart_id"] == apart_id
    )
    assert row["is_favorite"] is True
    fav_only = await client.get("/aparts", params={"favorites_only": "true"})
    assert {x["new_apart_id"] for x in fav_only.json()} == {apart_id}

    r3 = await client.delete(f"/favorites/{apart_id}")
    assert r3.json() == {"new_apart_id": apart_id, "is_favorite": False}
    assert apart_id not in (await client.get("/favorites")).json()
