import datetime

from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _seed_transitions(db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, price="12000000")
    await seed_apart(db, new_apart_id=2, price="10000000", property="Стандартная")
    await seed_apart(db, new_apart_id=3, price="9000000", reserve=0)
    await seed_apart(db, new_apart_id=4, price="8000000", plan="/plans/a.png")

    await db.execute(
        text("UPDATE new_aparts SET price = '11000000' WHERE new_apart_id = 1")
    )
    await db.execute(
        text(
            "UPDATE new_aparts SET property = 'Семейная ипотека' "
            "WHERE new_apart_id = 2"
        )
    )
    await db.execute(
        text("UPDATE new_aparts SET reserve = 1 WHERE new_apart_id = 3")
    )
    # noise: the source only re-hashed the floor-plan image URL
    await db.execute(
        text("UPDATE new_aparts SET plan = '/plans/b.png' WHERE new_apart_id = 4")
    )
    await db.commit()


async def test_changes_lists_only_real_transitions(client, db):
    await _seed_transitions(db)
    r = await client.get("/dashboard/changes")
    assert r.status_code == 200
    by_apart: dict[int, list[str]] = {}
    for row in r.json():
        by_apart.setdefault(row["new_apart_id"], []).append(row["kind"])
    assert by_apart.get(1) == ["price_drop"]
    assert by_apart.get(2) == ["family_on"]
    assert by_apart.get(3) == ["reserved"]
    assert 4 not in by_apart  # plan-url churn is not a change


async def test_changes_price_drop_carries_numbers(client, db):
    await _seed_transitions(db)
    row = next(
        x
        for x in (await client.get("/dashboard/changes")).json()
        if x["new_apart_id"] == 1
    )
    assert row["prev_price"] == 12000000
    assert row["next_price"] == 11000000
    assert row["pct"] == round((11000000 - 12000000) / 12000000 * 100, 1)


async def test_plan_only_update_creates_no_version(db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, plan="/plans/a.png")
    await db.execute(
        text("UPDATE new_aparts SET plan = '/plans/b.png' WHERE new_apart_id = 1")
    )
    await db.commit()
    n = await db.scalar(
        text("SELECT count(*) FROM new_aparts_history WHERE new_apart_id = 1")
    )
    assert n == 1  # only the initial version — no bogus v2


async def test_changes_empty_for_a_day_with_no_history(client, db):
    await _seed_transitions(db)
    past = (datetime.date.today() - datetime.timedelta(days=5)).isoformat()
    r = await client.get("/dashboard/changes", params={"date": past})
    assert r.status_code == 200
    assert r.json() == []


async def test_timeseries_counts_became_family_and_ignores_noise(client, db):
    await _seed_transitions(db)
    pts = (await client.get("/dashboard/timeseries")).json()
    today = pts[-1]
    assert today["became_family"] == 1
    assert today["changes"] == 3  # drop + family + reserve, not the plan churn
    assert today["drops"] == 1
