from tests.conftest import seed_apart, seed_building


async def test_comment_crud_and_flag(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1)
    await seed_apart(db, new_apart_id=2)
    await db.commit()

    assert (await client.get("/aparts/1/comments")).json() == []

    r = await client.post("/aparts/1/comments", json={"body": "нравится вид"})
    assert r.status_code == 200
    cid = r.json()["id"]
    assert r.json()["body"] == "нравится вид"

    await client.post("/aparts/1/comments", json={"body": "и этаж"})
    got = (await client.get("/aparts/1/comments")).json()
    assert [c["body"] for c in got] == ["нравится вид", "и этаж"]

    rows = {x["new_apart_id"]: x for x in (await client.get("/aparts")).json()}
    assert rows[1]["has_comment"] is True
    assert rows[2]["has_comment"] is False
    assert {x["new_apart_id"] for x in (await client.get("/aparts", params={"comment_only": "true"})).json()} == {1}

    d = await client.delete(f"/comments/{cid}")
    assert d.status_code == 204
    assert [c["body"] for c in (await client.get("/aparts/1/comments")).json()] == ["и этаж"]


async def test_empty_comment_rejected(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1)
    await db.commit()
    r = await client.post("/aparts/1/comments", json={"body": ""})
    assert r.status_code == 422
