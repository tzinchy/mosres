import datetime

from src.torgi_objects import TorgiObjectsService, _lot_columns
from tests.conftest import seed_torgi_object

PORTAL_LOT = {
    "id": 18397774,
    "objectTypeCode": "nsi:41:30011568",
    "objectTypeName": "Квартира",
    "typeCode": "nsi:tender_type_portal:13",
    "name": "2-комн. квартира на продажу, 50,70 м²",
    "url": "/tender/18397774",
    "address": "город Москва, Бескудниковский бульвар, дом 13, кв. 442",
    "shortAddress": "САО, Бескудниковский, Бескудниковский б-р, д. 13",
    "objectAddress": "город Москва, Бескудниковский бульвар, дом 13",
    "regionName": "Северный административный округ",
    "districtName": "Бескудниковский",
    "unom": 5003183,
    "objectArea": 50.7,
    "livingArea": 28.7,
    "kitchenArea": 9.8,
    "roomsCount": 2,
    "roomFloors": [5],
    "floors": 18,
    "startPrice": 10600000.0,
    "pricePerSquare": 209072.98,
    "coords": "[55.863126, 37.559686]",
    "attachedPics": [{"url": "/objectimages/Tenders/18397774/a.JPG"}],
    "subwayStations": [
        {
            "subwayStationName": "Верхние Лихоборы",
            "walkingTime": 9,
            "publicTransportTime": 9,
        }
    ],
    "portalViews": 737,
    "updateDate": "2026-10-03T08:15:38.0336637Z",
}


def test_lot_columns_maps_portal_fields():
    row = _lot_columns(PORTAL_LOT)
    assert row["lot_id"] == 18397774
    assert row["object_type_name"] == "Квартира"
    assert row["url"] == "https://torgi.mos.ru/tender/18397774"
    assert row["object_area"] == 50.7
    assert row["rooms_count"] == 2
    # roomFloors — список этажей объекта, в таблицу идёт первый
    assert row["room_floor"] == 5
    assert row["latitude"] == "55.863126"
    assert row["longitude"] == "37.559686"
    assert row["photos"] == [
        "https://torgi.mos.ru/objectimages/Tenders/18397774/a.JPG"
    ]
    assert row["metro"] == [
        {"name": "Верхние Лихоборы", "walk": 9, "transport": 9}
    ]


def test_detail_queue_order_and_archive_skip():
    """Карточки читаются по приоритету, прочитанный архив — никогда повторно."""
    now = datetime.datetime(2026, 10, 8)
    soon = "2026-11-01T00:00:00Z"
    lots = [
        # живой без карточки
        {"id": 1, "requestEndDate": soon, "updateDate": "2026-10-03T00:00:00Z"},
        # живой, карточка актуальна — портал не сдвигал updateDate
        {"id": 2, "requestEndDate": soon, "updateDate": "2026-10-03T00:00:00Z"},
        # живой, портал сдвинул updateDate — карточку перечитываем
        {"id": 3, "requestEndDate": soon, "updateDate": "2026-10-07T00:00:00Z"},
        # торги прошли недавно, итоговой цены нет — дочитываем
        {"id": 4, "tenderDate": "2026-10-01T00:00:00Z", "updateDate": "x"},
        # архив без карточки — в конец очереди
        {"id": 5, "tenderDate": "2021-01-01T00:00:00Z", "updateDate": "x"},
        # архив с карточкой — не читаем вовсе
        {"id": 6, "tenderDate": "2021-01-01T00:00:00Z", "updateDate": "x"},
        # заглушка даты портала (9999) — это не «живой» лот, а архив
        {"id": 7, "tenderDate": "9999-12-31T00:00:00Z", "updateDate": "x"},
    ]
    fetched = datetime.datetime(2026, 10, 7)
    known = {
        2: {
            "detail_fetched_at": fetched,
            "source_updated_at": datetime.datetime(2026, 10, 3),
            "final_price": None,
        },
        3: {
            "detail_fetched_at": fetched,
            "source_updated_at": datetime.datetime(2026, 10, 3),
            "final_price": None,
        },
        4: {
            "detail_fetched_at": fetched,
            "source_updated_at": datetime.datetime(2026, 10, 3),
            "final_price": None,
        },
        6: {
            "detail_fetched_at": fetched,
            "source_updated_at": datetime.datetime(2026, 10, 3),
            "final_price": 1,
        },
    }
    queue, backfill = TorgiObjectsService._detail_queue(lots, known, now)
    assert queue == [1, 3, 4, 5, 7]
    assert backfill == [5, 7]
    # бюджет режет хвост очереди, живые лоты в него попадают всегда
    assert queue[:2] == [1, 3]


async def test_objects_endpoint_filters_and_favorites(client, db):
    live = await seed_torgi_object(db)
    archived = await seed_torgi_object(
        db,
        lot_id=17631160,
        object_type_name="Машино-место",
        name="Машино-место на продажу",
        address="город Москва, Открытое шоссе, дом 19Б, маш. 42",
        district_name="Метрогородок",
        object_area=14.3,
        rooms_count=None,
        start_price=100000,
        request_end_date=datetime.datetime(2021, 11, 1),
        tender_date=datetime.datetime(2021, 11, 9),
        final_price=110000,
    )
    await db.commit()

    rows = (await client.get("/torgi/objects")).json()
    assert {r["lot_id"] for r in rows} == {live, archived}
    # живые лоты идут первыми
    assert rows[0]["lot_id"] == live and rows[0]["is_live"] is True

    live_rows = (await client.get("/torgi/objects", params={"live_only": "true"})).json()
    assert {r["lot_id"] for r in live_rows} == {live}

    by_type = (
        await client.get("/torgi/objects", params={"object_type": "Машино-место"})
    ).json()
    assert {r["lot_id"] for r in by_type} == {archived}

    sold = (await client.get("/torgi/objects", params={"sold_only": "true"})).json()
    assert {r["lot_id"] for r in sold} == {archived}
    assert sold[0]["final_price_delta_pct"] == 10.0

    rooms = (await client.get("/torgi/objects", params={"rooms": 2})).json()
    assert {r["lot_id"] for r in rooms} == {live}

    found = (await client.get("/torgi/objects", params={"q": "Бескудниковский"})).json()
    assert {r["lot_id"] for r in found} == {live}

    assert (await client.post(f"/torgi/objects/favorites/{live}")).status_code == 200
    assert (await client.get("/torgi/objects/favorites")).json() == [live]
    fav_rows = (await client.get("/torgi/objects", params={"fav_only": "true"})).json()
    assert {r["lot_id"] for r in fav_rows} == {live}
    assert (await client.delete(f"/torgi/objects/favorites/{live}")).status_code == 200
    assert (await client.get("/torgi/objects/favorites")).json() == []


async def test_objects_stats_and_versions(client, db):
    lot_id = await seed_torgi_object(db)
    await seed_torgi_object(
        db, lot_id=17631160, object_type_name="Машино-место", start_price=100000
    )
    await db.commit()

    stats = {s["object_type_name"]: s for s in (await client.get("/torgi/objects/stats")).json()}
    assert stats["Квартира"]["lots"] == 1
    assert stats["Квартира"]["live_lots"] == 1
    assert stats["Машино-место"]["lots"] == 1

    # новая версия пишется триггером: меняем цену и смотрим историю
    from sqlalchemy import text

    await db.execute(
        text("UPDATE torgi_objects SET start_price = 9900000 WHERE lot_id = :i"),
        {"i": lot_id},
    )
    await db.commit()

    versions = (await client.get(f"/torgi/objects/{lot_id}/versions")).json()
    assert [v["version"] for v in versions] == [2, 1]
    assert versions[0]["start_price"] == 9900000.0
    assert versions[0]["start_price_prev"] == 10600000.0

    row = (await client.get(f"/torgi/objects/{lot_id}")).json()
    assert row["start_price"] == 9900000.0
    assert row["start_price_prev"] == 10600000.0
    assert row["start_price_delta_pct"] == -6.6

    assert (await client.get("/torgi/objects/404404")).status_code == 404


async def test_list_only_run_keeps_card_fields(client, db):
    """Прогон без чтения карточки не затирает статус, кадастр и итоговую цену.

    Карточки архивных лотов читаются порциями, поэтому почти каждый прогон
    приходит по лоту без них — поля должны выживать (COALESCE в upsert).
    """
    from sqlalchemy import text

    from src.repository import upsert_with_except_from_temp_table
    from src.torgi_objects import DETAIL_COLUMNS, TorgiObjectsService

    lot_id = await seed_torgi_object(
        db,
        status_text="Прием заявок",
        cadastral_number="77:09:0002026:16629",
        final_price=11000000,
        detail_fetched_at=datetime.datetime(2026, 10, 1),
    )
    await db.commit()

    # то же, что пишет прогон по списку: поля карточки — NULL
    row = {column: None for column in TorgiObjectsService.LOT_COLUMNS}
    row.update(
        {
            "lot_id": lot_id,
            "object_type_name": "Квартира",
            "name": "2-комн. квартира на продажу, 50,70 м²",
            "start_price": 10600000,
        }
    )
    await upsert_with_except_from_temp_table(
        table="torgi_objects",
        temp_table="torgi_objects_temp",
        columns=TorgiObjectsService.LOT_COLUMNS,
        on_conflict_column="lot_id",
        data=[row],
        session=db,
        coalesce_columns=(*DETAIL_COLUMNS, "detail_fetched_at"),
    )
    await db.commit()

    stored = (
        await db.execute(
            text(
                "SELECT status_text, cadastral_number, final_price,"
                " detail_fetched_at, start_price FROM torgi_objects"
                " WHERE lot_id = :i"
            ),
            {"i": lot_id},
        )
    ).mappings().one()
    assert stored["status_text"] == "Прием заявок"
    assert stored["cadastral_number"] == "77:09:0002026:16629"
    assert float(stored["final_price"]) == 11000000.0
    assert stored["detail_fetched_at"] == datetime.datetime(2026, 10, 1)
    # а поля списка обновляются как обычно
    assert float(stored["start_price"]) == 10600000.0
