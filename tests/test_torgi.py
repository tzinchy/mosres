import datetime

from sqlalchemy import text

from src.schemas import TorgiLotSchema
from src.torgi import DETAIL_COLUMNS, TorgiService, _detail_columns, _lot_columns
from tests.conftest import seed_torgi_lot

LOT = {
    "id": 20200446,
    "name": "Легковой автомобиль на продажу, UAZ PATRIOT, 2013",
    "url": "/tender/20200446",
    "startPrice": 92397.0,
    "mileage": 272579,
    "engine": "2235,00 куб.см",
    "drive": "полный",
    "transmission": "МКПП",
    "requestStartDate": "2026-09-23T17:00:00.0000000Z",
    "requestEndDate": "2026-10-30T12:00:00.0000000Z",
    "tenderDate": "2026-11-12T07:00:00.0000000Z",
    "finalDate": "2026-11-12T14:00:00Z",
    "portalViews": 249,
    "platformLink": "https://www.roseltorg.ru/procedure/21000005000000033918/1",
    "coords": "[55.71720148187288, 37.85658806562424]",
    "updateDate": "2026-10-03T03:04:57.7382074Z",
    "attachedPics": [{"url": "/objectimages/Tenders/20200446/a.jpg"}],
}

DETAIL = {
    "tenderId": 20200446,
    "linkVideo": "https://rutube.ru/play/embed/abc",
    "sidebar": {"tenderStatusInfo": {"statusText": "Прием заявок"}},
    "objectInfo": [
        {"label": "Категория транспорта", "value": "Легковые автомобили"},
        {"label": "Марка", "value": "UAZ"},
        {"label": "Модель", "value": "PATRIOT"},
        {"label": "Год выпуска", "value": "2013"},
        {"label": "Государственный регистрационный знак", "value": "А001АА77"},
        {"label": "VIN номер", "value": "XTT316300D1000000"},
        {"label": "Наличие ПТС", "value": "есть"},
        {"label": "Пробег, км", "value": "272 579"},
    ],
    "procedureInfo": [
        {"label": "Размер задатка", "value": "9 239,70 руб."},
        {"label": "Шаг аукциона", "value": "4 619,85 руб."},
        {"label": "Итоговая цена", "value": "598219,00"},
        {
            "label": "Ссылка на torgi.gov.ru",
            "value": "https://torgi.gov.ru/new/public/notices/view/1",
        },
    ],
}


def test_lot_and_detail_parse_into_row():
    row = _lot_columns(LOT) | _detail_columns(DETAIL)
    parsed = TorgiLotSchema.model_validate(row)

    assert parsed.lot_id == 20200446
    assert parsed.url == "https://torgi.mos.ru/tender/20200446"
    assert float(parsed.start_price) == 92397.0
    assert float(parsed.deposit) == 9239.70
    assert float(parsed.final_price) == 598219.0
    assert parsed.plate == "А001АА77"
    assert parsed.vin == "XTT316300D1000000"
    assert parsed.year == 2013
    assert parsed.mileage == 272579
    assert parsed.status_text == "Прием заявок"
    assert parsed.latitude == "55.71720148187288"
    assert parsed.photos == [
        "https://torgi.mos.ru/objectimages/Tenders/20200446/a.jpg"
    ]
    # 7 знаков в дробной части и Z — наивный UTC, иначе asyncpg не вставит
    assert parsed.request_end_date.isoformat() == "2026-10-30T12:00:00"
    assert parsed.source_updated_at.tzinfo is None


async def test_torgi_lots_endpoint(client, db):
    await seed_torgi_lot(db)
    await seed_torgi_lot(
        db,
        lot_id=1,
        name="Автобус на продажу, 2227 SD, 2012",
        status_text="Признаны состоявшимися",
        transport_category="Автобусы",
        brand="2227",
        model="SD",
        plate="",
        vin="",
    )
    await db.commit()

    response = await client.get("/torgi/lots")
    assert response.status_code == 200
    assert {row["lot_id"] for row in response.json()} == {1, 20200446}

    open_only = await client.get("/torgi/lots", params={"open_only": True})
    assert [row["lot_id"] for row in open_only.json()] == [20200446]

    found = await client.get("/torgi/lots", params={"q": "patriot"})
    assert [row["lot_id"] for row in found.json()] == [20200446]

    with_plate = await client.get("/torgi/lots", params={"with_plate_only": True})
    assert [row["lot_id"] for row in with_plate.json()] == [20200446]

    one = await client.get("/torgi/lots/20200446")
    assert one.json()["torgi_url"] == "https://torgi.mos.ru/tender/20200446"
    assert one.json()["is_open"] is True
    assert (await client.get("/torgi/lots/999999")).status_code == 404


async def test_torgi_stats_endpoint(client, db):
    await seed_torgi_lot(db)
    await db.commit()

    stats = (await client.get("/torgi/stats")).json()
    assert stats[0]["category"] == "Легковые автомобили"
    assert stats[0]["lots"] == 1
    assert stats[0]["open_lots"] == 1
    assert stats[0]["with_plate"] == 1


async def test_price_change_bumps_version_views_do_not(db):
    lot_id = await seed_torgi_lot(db, version=0, portal_views=10)

    await db.execute(
        text("UPDATE torgi_lots SET portal_views = 99 WHERE lot_id = :i"),
        {"i": lot_id},
    )
    version = await db.scalar(
        text("SELECT version FROM torgi_lots WHERE lot_id = :i"), {"i": lot_id}
    )
    assert version == 1, "счётчик просмотров не должен плодить версии"

    await db.execute(
        text("UPDATE torgi_lots SET start_price = 80000 WHERE lot_id = :i"),
        {"i": lot_id},
    )
    version = await db.scalar(
        text("SELECT version FROM torgi_lots WHERE lot_id = :i"), {"i": lot_id}
    )
    assert version == 2

    history = (
        await db.execute(
            text(
                "SELECT version, start_price FROM torgi_lots_history "
                "WHERE lot_id = :i ORDER BY version"
            ),
            {"i": lot_id},
        )
    ).all()
    assert [int(row[1]) for row in history] == [92397, 80000]


# --- номер, избранное, паттерны, отчёты --------------------------------------


def test_plate_columns_filled_on_load():
    row = _lot_columns(LOT) | _detail_columns(DETAIL)
    parsed = TorgiLotSchema.model_validate(row)

    assert parsed.plate_norm == "А001АА77"
    assert parsed.plate_region == "77"
    assert parsed.plate_valid is True
    # три колонки обязаны попасть и в upsert, и в копирование старой карточки,
    # иначе при неизменившемся лоте они бы затирались
    for column in ("plate_norm", "plate_region", "plate_valid"):
        assert column in TorgiService.LOT_COLUMNS
        assert column in DETAIL_COLUMNS


def test_garbage_plate_is_saved_but_not_valid():
    detail = {
        **DETAIL,
        "objectInfo": [
            {"label": "Государственный регистрационный знак", "value": "отсутствует"}
        ],
    }
    parsed = TorgiLotSchema.model_validate(_lot_columns(LOT) | _detail_columns(detail))
    assert parsed.plate_norm == "ОТСУТСТВУЕТ"
    assert parsed.plate_region is None
    assert parsed.plate_valid is False


async def test_torgi_favorites(client, db):
    lot_id = await seed_torgi_lot(db)
    await seed_torgi_lot(db, lot_id=2, plate="")
    await db.commit()

    added = await client.post(f"/torgi/favorites/{lot_id}")
    assert added.status_code == 200
    assert added.json() == {"lot_id": lot_id, "is_favorite": True}
    # повторный вызов идемпотентен
    assert (await client.post(f"/torgi/favorites/{lot_id}")).json()["is_favorite"]

    assert (await client.get("/torgi/favorites")).json() == [lot_id]
    row = next(
        x for x in (await client.get("/torgi/lots")).json() if x["lot_id"] == lot_id
    )
    assert row["is_favorite"] is True
    fav_only = await client.get("/torgi/lots", params={"fav_only": True})
    assert [x["lot_id"] for x in fav_only.json()] == [lot_id]

    removed = await client.delete(f"/torgi/favorites/{lot_id}")
    assert removed.json() == {"lot_id": lot_id, "is_favorite": False}
    assert (await client.get("/torgi/favorites")).json() == []


async def test_plate_watch_mask_matches_lots(client, db):
    lot_id = await seed_torgi_lot(db)
    await seed_torgi_lot(db, lot_id=2, plate="АА12377")  # такси, под маску не подходит
    await db.commit()

    created = await client.post("/torgi/watches", json={"mask": "?###??*"})
    assert created.status_code == 200
    watch = created.json()
    assert watch["mask"] == "?###??*"
    assert watch["regex"].startswith("^") and watch["regex"].endswith("$")
    assert watch["matched_now"] == 1

    listed = (await client.get("/torgi/watches")).json()
    assert [w["id"] for w in listed] == [watch["id"]]
    assert listed[0]["matched_now"] == 1

    rows = {x["lot_id"]: x for x in (await client.get("/torgi/lots")).json()}
    assert rows[lot_id]["matched_masks"] == ["?###??*"]
    assert rows[2]["matched_masks"] == []

    watch_only = await client.get("/torgi/lots", params={"watch_only": True})
    assert [x["lot_id"] for x in watch_only.json()] == [lot_id]

    assert (await client.delete(f"/torgi/watches/{watch['id']}")).status_code == 204
    assert (await client.get("/torgi/watches")).json() == []
    # чужой/несуществующий паттерн не удаляем
    assert (await client.delete("/torgi/watches/999999")).status_code == 404


async def test_plate_watch_preset_and_bad_mask(client, db):
    await seed_torgi_lot(db, plate="А777АА77")
    await db.commit()

    presets = (await client.get("/torgi/presets")).json()
    assert {"preset": "Три одинаковые цифры", "label": "Три одинаковые цифры"} in presets

    created = await client.post(
        "/torgi/watches", json={"preset": "Три одинаковые цифры"}
    )
    assert created.status_code == 200
    watch = created.json()
    assert watch["mask"] is None  # пресет живёт готовым regex
    assert watch["label"] == "Три одинаковые цифры"
    assert watch["matched_now"] == 1

    # дубликат идемпотентен: тот же паттерн — тот же id
    again = await client.post("/torgi/watches", json={"preset": "Три одинаковые цифры"})
    assert again.json()["id"] == watch["id"]

    bad = await client.post("/torgi/watches", json={"mask": "=А001"})
    assert bad.status_code == 422
    assert "=" in bad.json()["detail"]

    assert (await client.post("/torgi/watches", json={})).status_code == 422
    assert (
        await client.post("/torgi/watches", json={"preset": "нет такого"})
    ).status_code == 422


async def test_torgi_notifications(client, db):
    lot_id = await seed_torgi_lot(db)
    await db.commit()
    await client.post("/torgi/watches", json={"mask": "?###??*", "label": "мой"})
    await client.post(f"/torgi/favorites/{lot_id}")

    # падение начальной цены по избранному лоту — вторая версия в истории
    await db.execute(
        text("UPDATE torgi_lots SET start_price = 80000 WHERE lot_id = :i"),
        {"i": lot_id},
    )
    await db.commit()

    events = (await client.get("/torgi/notifications")).json()
    kinds = {e["kind"] for e in events}
    assert kinds == {"plate_match", "lot_change"}

    match = next(e for e in events if e["kind"] == "plate_match")
    assert match["lot_id"] == lot_id
    assert match["plate_norm"] == "А001АА77"
    assert match["matched_masks"] == ["мой"]
    assert match["version"] == 1  # первая версия, на которой номер подошёл

    change = next(e for e in events if e["kind"] == "lot_change")
    assert change["price_down"] is True
    assert change["start_price"] == 80000
    assert change["prev_start_price"] == 92397

    # окно days обрезает ленту
    assert (await client.get("/torgi/notifications", params={"days": 0})).json() == []


async def test_torgi_dashboard_payload(client, db):
    await seed_torgi_lot(db)
    await seed_torgi_lot(
        db,
        lot_id=2,
        name="Автобус на продажу, 2227 SD, 2012",
        status_text="Признаны состоявшимися",
        transport_category="Автобусы",
        brand="2227",
        plate="А777АА77",
        start_price=100000,
        final_price=250000,
        year=2012,
        mileage=12000,
        tender_date=datetime.datetime(2026, 11, 12, 7, 0),
    )
    await db.commit()
    await client.post("/torgi/watches", json={"mask": "?###??*"})

    payload = (await client.get("/torgi/dashboard")).json()
    assert set(payload) == {
        "last_refresh", "kpi", "categories", "brands", "funnel", "timeseries",
        "seasonality", "deadlines", "changes", "discount_hist", "year_hist",
        "mileage_hist", "top_drop", "top_premium", "top_views", "data_quality",
        "plate_flavors", "version_activity",
    }
    assert payload["last_refresh"] is not None

    kpi = payload["kpi"]
    assert kpi["lots"] == 2
    assert kpi["open_lots"] == 1
    assert kpi["sold_lots"] == 1
    assert kpi["with_plate"] == 2
    assert kpi["watch_matches"] == 2
    # А001АА77 — «малые цифры 001–009», А777АА77 — «три одинаковые цифры»
    assert kpi["interesting_plates"] == 2
    assert kpi["median_final_delta_pct"] == 150.0
    assert kpi["photos_coverage_pct"] == 0

    quality = payload["data_quality"]
    assert quality["lots"] == 2
    assert quality["vin"] == 100  # проценты, не доли
    assert quality["photos"] == 0
    assert {b["brand"] for b in payload["brands"]} == {"UAZ", "2227"}
    assert [f["status"] for f in payload["funnel"]] == [
        "Приём заявок", "Торги назначены", "Завершены", "Продано"
    ]
    assert payload["timeseries"][0]["month"] == "2026-11-01"
    assert payload["seasonality"] == [{"month_of_year": 11, "lots": 1}]
    assert {y["bucket"] for y in payload["year_hist"]} == {"2012", "2013"}
    assert sum(m["lots"] for m in payload["mileage_hist"]) == 2
    assert [t["lot_id"] for t in payload["top_premium"]] == [2]
    assert payload["version_activity"]["versions"] == [{"bucket": "1", "lots": 2}]
    assert payload["version_activity"]["changes_by_day"] == []
    flavors = {f["preset"]: f["lots"] for f in payload["plate_flavors"]}
    assert flavors["Три одинаковые цифры"] == 1
    assert flavors["Малые цифры 001–009"] == 1


async def test_torgi_pivot(client, db):
    await seed_torgi_lot(db, power="122,00 л.с.")
    await seed_torgi_lot(db, lot_id=2, brand="2227", start_price=100000, final_price=250000)
    await db.commit()

    rows = (await client.get("/torgi/pivot", params={"dimension": "brand"})).json()
    by_key = {r["key"]: r for r in rows}
    assert set(by_key) == {"UAZ", "2227"}
    assert by_key["UAZ"]["lots"] == 1
    assert by_key["UAZ"]["avg_power"] == 122
    assert by_key["UAZ"]["rub_per_hp"] == 757  # 92397 / 122
    assert by_key["2227"]["avg_delta_pct"] == 150.0
    assert by_key["2227"]["sold_lots"] == 1

    region = await client.get("/torgi/pivot", params={"dimension": "plate_region"})
    assert [r["key"] for r in region.json()] == ["77"]

    bad = await client.get("/torgi/pivot", params={"dimension": "plate; drop table"})
    assert bad.status_code == 422


async def test_torgi_points(client, db):
    await seed_torgi_lot(
        db,
        power="122,00 л.с.",
        engine_volume="2235,00 куб.см",
        latitude="55.7172",
        longitude="37.8565",
        final_price=250000,
        start_price=100000,
        portal_views=249,
    )
    await seed_torgi_lot(db, lot_id=2, latitude="", longitude=None, power=None)
    await db.commit()

    points = (await client.get("/torgi/points")).json()
    assert [p["lot_id"] for p in points] == [2, 20200446]
    point = next(p for p in points if p["lot_id"] == 20200446)
    assert point["power_hp"] == 122
    assert point["engine_volume"] == 2235
    assert point["latitude"] == 55.7172
    assert point["delta_pct"] == 150.0
    assert point["is_open"] is True
    assert point["plate_region"] == "77"
    assert point["category"] == "Легковые автомобили"
    # битые координаты не ломают выдачу
    assert next(p for p in points if p["lot_id"] == 2)["latitude"] is None
    assert "photos" not in point


async def test_lot_versions_shape_and_export_filters(client, db):
    lot_id = await seed_torgi_lot(db)
    await seed_torgi_lot(db, lot_id=2, plate="")
    await db.execute(
        text("UPDATE torgi_lots SET start_price = 80000 WHERE lot_id = :i"),
        {"i": lot_id},
    )
    await db.commit()

    versions = (await client.get(f"/torgi/lots/{lot_id}/versions")).json()
    assert [v["version"] for v in versions] == [1, 2]
    assert {"version", "updated_at", "status_text", "start_price", "final_price",
            "plate", "plate_norm", "lot_id", "deposit", "auction_step", "mileage",
            "request_end_date", "tender_date"} <= set(versions[0])
    # числа — числами, иначе график цены на фронте строить нечем
    assert versions[0]["start_price"] == 92397
    assert versions[1]["start_price"] == 80000
    assert versions[0]["plate_norm"] == "А001АА77"

    # выгрузка принимает весь набор фильтров таблицы
    await client.post(f"/torgi/favorites/{lot_id}")
    excel = await client.get(
        "/torgi/file",
        params={"fav_only": True, "watch_only": False, "valid_plate_only": True,
                "plate_region": "77", "q": "patriot"},
    )
    assert excel.status_code == 200
    assert excel.headers["content-type"].startswith(
        "application/vnd.openxmlformats"
    )
