from sqlalchemy import text

from tests.conftest import seed_apart, seed_building


async def _history_count(db, apart_id: int) -> int:
    r = await db.execute(
        text("SELECT count(*) FROM new_aparts_history WHERE new_apart_id = :i"),
        {"i": apart_id},
    )
    return r.scalar_one()


async def test_insert_writes_one_history_row_at_version_1(db):
    apart_id = await seed_apart(db)
    assert await _history_count(db, apart_id) == 1
    v = await db.execute(
        text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id}
    )
    assert v.scalar_one() == 1


async def test_noop_update_writes_no_history_and_keeps_version(db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET address = address WHERE new_apart_id = :i"),
        {"i": apart_id},
    )
    assert await _history_count(db, apart_id) == 1
    v = await db.execute(
        text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id}
    )
    assert v.scalar_one() == 1


async def test_meaningful_update_adds_one_history_row_and_bumps_version(db):
    apart_id = await seed_apart(db)
    await db.execute(
        text("UPDATE new_aparts SET price = '11000000' WHERE new_apart_id = :i"),
        {"i": apart_id},
    )
    assert await _history_count(db, apart_id) == 2
    v = await db.execute(
        text("SELECT version FROM new_aparts WHERE new_apart_id = :i"), {"i": apart_id}
    )
    assert v.scalar_one() == 2
    versions = await db.execute(
        text(
            "SELECT version FROM new_aparts_history WHERE new_apart_id = :i ORDER BY version"
        ),
        {"i": apart_id},
    )
    assert [x[0] for x in versions] == [1, 2]


async def test_buildings_noop_update_writes_no_history(db):
    bid = await seed_building(db)
    r0 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    before = r0.scalar_one()
    await db.execute(
        text("UPDATE buildings SET code = code WHERE building_id = :i"), {"i": bid}
    )
    r1 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    assert r1.scalar_one() == before


async def test_buildings_meaningful_update_adds_history(db):
    bid = await seed_building(db)
    r0 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    before = r0.scalar_one()
    await db.execute(
        text("UPDATE buildings SET status_code = 'FINISHED' WHERE building_id = :i"),
        {"i": bid},
    )
    r1 = await db.execute(
        text("SELECT count(*) FROM buildings_history WHERE building_id = :i"), {"i": bid}
    )
    assert r1.scalar_one() == before + 1
