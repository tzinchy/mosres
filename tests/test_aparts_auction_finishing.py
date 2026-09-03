from tests.conftest import seed_apart, seed_building


async def _seed(db):
    await seed_building(db, building_id=1, finishing_code="NO", code="b-no")
    await seed_building(db, building_id=2, finishing_code="FULL", code="b-full")
    await seed_apart(db, new_apart_id=1, building_id="1", building_code="b-no")
    await seed_apart(
        db,
        new_apart_id=2,
        building_id="2",
        building_code="b-full",
        auction="https://torgi.mos.ru/tender/1",
    )
    await db.commit()


async def test_row_carries_finishing_and_auction(client, db):
    await _seed(db)
    rows = {r["new_apart_id"]: r for r in (await client.get("/aparts")).json()}
    assert rows[1]["finishing_label"] == "Без отделки"
    assert rows[1]["is_auction"] is False
    assert rows[2]["finishing_label"] == "С отделкой"
    assert rows[2]["is_auction"] is True
    assert rows[2]["auction_url"] == "https://torgi.mos.ru/tender/1"


async def test_auction_only_filter(client, db):
    await _seed(db)
    rows = (await client.get("/aparts", params={"auction_only": "true"})).json()
    assert [r["new_apart_id"] for r in rows] == [2]


async def test_finishing_filter(client, db):
    await _seed(db)
    rows = (await client.get("/aparts", params={"finishing": "FULL"})).json()
    assert [r["new_apart_id"] for r in rows] == [2]


async def test_pivot_by_finishing(client, db):
    await _seed(db)
    got = {
        p["key"]: p["value"]
        for p in (
            await client.get(
                "/dashboard/pivot",
                params={"dimension": "finishing", "metric": "count"},
            )
        ).json()
    }
    assert got == {"Без отделки": 1, "С отделкой": 1}


async def test_pivot_auction_metric(client, db):
    await _seed(db)
    got = {
        p["key"]: p["value"]
        for p in (
            await client.get(
                "/dashboard/pivot",
                params={"dimension": "rooms", "metric": "auction"},
            )
        ).json()
    }
    assert sum(got.values()) == 1
