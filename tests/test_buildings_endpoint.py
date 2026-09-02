from sqlalchemy import text

from src.repository import refresh_building_price_stats
from tests.conftest import seed_apart, seed_building


async def test_price_dynamics_two_points_ordered(client, db):
    await seed_building(db)
    await seed_apart(db, new_apart_id=1, building_id="1", price_m="200000")
    await refresh_building_price_stats(session=db)
    await db.execute(text("UPDATE building_price_stats SET snapshot_date = '2026-08-01'"))
    await db.execute(text("UPDATE new_aparts SET price_m = '250000' WHERE new_apart_id = 1"))
    await refresh_building_price_stats(session=db)
    await db.commit()

    r = await client.get("/buildings/1/price-dynamics")
    assert r.status_code == 200
    pts = r.json()
    assert len(pts) == 2
    assert [p["snapshot_date"] for p in pts] == sorted(p["snapshot_date"] for p in pts)


async def test_buildings_resolve_metro_and_labels(client, db):
    await db.execute(
        text("INSERT INTO metros (metro_id, name, color) VALUES (777, 'Тёплый Стан', '#f00')")
    )
    await seed_building(
        db,
        status_code="FINISHED",
        finishing_code="STD",
        metro=["777", "888"],
        metro_car=["10 мин.", "20 мин."],
        img="/upload/x.jpg",
    )
    await db.commit()
    r = await client.get("/buildings")
    b = next(x for x in r.json() if x["building_id"] == 1)
    assert b["status_label"] == "Введён в эксплуатацию"
    assert b["finishing_label"] == "Отделка по стандарту реновации"
    assert b["img_url"] == "https://xn--80aae5aibotfo5h.xn--p1ai/upload/x.jpg"
    assert b["metro"][0] == {
        "name": "Тёплый Стан",
        "color": "#f00",
        "car": "10 мин.",
        "walk": None,
    }
    assert b["metro"][1]["name"] == "888"  # unknown id falls back to the id


async def test_building_versions(client, db):
    bid = await seed_building(db)
    await db.execute(
        text("UPDATE buildings SET status_code = 'FINISHED' WHERE building_id = :i"),
        {"i": bid},
    )
    await db.commit()
    r = await client.get(f"/buildings/{bid}/versions")
    assert r.status_code == 200
    assert len(r.json()) >= 1
