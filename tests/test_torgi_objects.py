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


async def test_views_history_without_new_version(client, db):
    """Портал крутит счётчик просмотров: значение обновляется и копится по дням,
    а версия лота и история изменений не растут."""
    from sqlalchemy import text

    from src.repository import upsert_with_except_from_temp_table
    from src.torgi_objects import DETAIL_COLUMNS, TorgiObjectsService, _jsonb

    lot_id = await seed_torgi_object(db, portal_views=100)
    await db.commit()

    async def run(**changes):
        stored = (
            await db.execute(
                text("SELECT * FROM torgi_objects WHERE lot_id = :i"), {"i": lot_id}
            )
        ).mappings().one()
        row = _jsonb({c: stored[c] for c in TorgiObjectsService.LOT_COLUMNS})
        row.update(changes)
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

    async def state():
        return (
            await db.execute(
                text(
                    "SELECT o.portal_views, o.version,"
                    " (SELECT count(*) FROM torgi_objects_history WHERE lot_id = o.lot_id) hist,"
                    " (SELECT array_agg(views ORDER BY day) FROM torgi_object_views"
                    "   WHERE lot_id = o.lot_id) series"
                    " FROM torgi_objects o WHERE o.lot_id = :i"
                ),
                {"i": lot_id},
            )
        ).mappings().one()

    first = await state()
    assert (first["portal_views"], first["version"], first["hist"]) == (100, 1, 1)
    assert first["series"] == [100]

    # изменились только просмотры: значение лежит, версии нет, точка за сегодня
    # перезаписана (одна строка на лот и день)
    await run(portal_views=150)
    after_views = await state()
    assert (after_views["portal_views"], after_views["version"]) == (150, 1)
    assert after_views["hist"] == 1
    assert after_views["series"] == [150]

    # список без счётчика (NULL) просмотры не затирает
    await run(portal_views=None)
    assert (await state())["portal_views"] == 150

    # настоящая правка по-прежнему заводит версию
    await run(start_price=10500000, portal_views=160)
    after_price = await state()
    assert (after_price["portal_views"], after_price["version"]) == (160, 2)
    assert after_price["hist"] == 2


async def test_objects_invest_and_views(client, db):
    """Сегменты считаются по завершённым продажам, живой лот дешевле типичного
    итога попадает в «возможности», а ряд просмотров отдаётся по дням."""
    past = datetime.datetime.now() - datetime.timedelta(days=30)
    for i in range(10):
        await seed_torgi_object(
            db,
            lot_id=1000 + i,
            status_text="Признаны состоявшимися",
            start_price=10000000,
            final_price=11000000,  # 220 000 ₽/м², наценка 10 %
            object_area=50,
            request_end_date=past,
            tender_date=past,
        )
    live_id = await seed_torgi_object(
        db, lot_id=2000, start_price=8000000, object_area=50, portal_views=7
    )
    await db.commit()

    invest = (await client.get("/torgi/objects/invest")).json()
    (segment,) = invest["segments"]
    assert segment["object_type_name"] == "Квартира"
    assert (segment["sold"], segment["finished"]) == (10, 10)
    assert segment["median_final_ppm"] == 220000.0
    assert segment["median_premium"] == 0.1
    assert segment["live_lots"] == 1

    (deal,) = invest["deals"]
    assert deal["lot_id"] == live_id
    assert deal["bench_level"] == "district"
    assert deal["bench_ppm"] == 220000.0
    assert deal["start_ppm"] == 160000.0
    assert deal["discount"] == 0.273
    assert deal["est_final_price"] == 8800000.0

    views = (await client.get(f"/torgi/objects/{live_id}/views")).json()
    assert [v["views"] for v in views] == [7]

    series = (await client.get(f"/torgi/objects/views-series?ids={live_id},1000,x")).json()
    assert [p["views"] for p in series[str(live_id)]] == [7]


async def test_objects_odds_follow_views_per_day(client, db):
    """Чем быстрее копятся просмотры, тем выше шанс продажи и борьбы; живой лот
    получает шансы той группы, в которую попадает по скорости просмотров."""
    now = datetime.datetime.now()
    start = now - datetime.timedelta(days=10)
    # 200 завершённых лотов: просмотры растут вместе с lot_id, продаются и
    # борются только «жаркие» (вторая половина)
    for i in range(200):
        hot = i >= 100
        await seed_torgi_object(
            db,
            lot_id=1000 + i,
            status_text="Признаны состоявшимися" if hot else "Признаны несостоявшимися",
            start_price=1000000,
            final_price=1200000 if hot else None,
            request_start_date=start,
            request_end_date=start + datetime.timedelta(days=10),
            tender_date=start + datetime.timedelta(days=12),
            portal_views=(i + 1) * 10,  # 1..200 просмотров в день
        )
    live_cold = await seed_torgi_object(
        db, lot_id=5000, request_start_date=now - datetime.timedelta(days=5), portal_views=5
    )
    live_hot = await seed_torgi_object(
        db, lot_id=5001, request_start_date=now - datetime.timedelta(days=5), portal_views=5000
    )
    await db.commit()

    odds = {o["lot_id"]: o for o in (await client.get("/torgi/objects/odds")).json()}
    assert odds[live_cold]["p_sold"] == 0.0
    assert odds[live_hot]["p_sold"] == 1.0
    assert odds[live_hot]["p_competed"] == 1.0
    assert odds[live_cold]["bucket"] == 1 and odds[live_hot]["bucket"] == 5


async def test_objects_dashboard(client, db):
    from sqlalchemy import text

    live = await seed_torgi_object(db)
    await seed_torgi_object(
        db,
        lot_id=17631160,
        object_type_name="Машино-место",
        name="Машино-место на продажу",
        start_price=1000000,
        price_per_square=76923.0,
        object_area=13.0,
        rooms_count=None,
        region_name="Южный административный округ",
        district_name="Царицыно",
        request_end_date=datetime.datetime.now() - datetime.timedelta(days=40),
        tender_date=datetime.datetime.now() - datetime.timedelta(days=30),
        final_price=1200000,
    )
    await db.commit()

    # вторая версия живого лота: триггер истории даёт строку в changes
    await db.execute(
        text("UPDATE torgi_objects SET start_price = 9900000 WHERE lot_id = :i"),
        {"i": live},
    )
    await db.commit()

    board = (await client.get("/torgi/objects/dashboard")).json()

    kpi = board["kpi"]
    assert kpi["lots"] == 2
    assert kpi["live_lots"] == 1  # второй лот отторгован
    assert kpi["sold_lots"] == 1
    assert kpi["object_types"] == 2
    assert kpi["changed_24h"] == 1
    assert board["last_refresh"] is not None

    quality = board["data_quality"]
    assert quality["lots"] == 2
    assert quality["address"] == 100.0
    assert quality["area"] == 100.0
    # комнаты бывают только у квартиры: полнота считается по её типу, а не по
    # всем лотам, иначе машино-место «роняет» её до 50 %
    assert quality["rooms"] == 100.0
    assert quality["rooms_of"] == 1
    # кадастра нет ни у одного типа — применимых лотов нет, показывать нечего
    assert quality["cadastral"] is None
    assert quality["cadastral_of"] == 0

    funnel = {stage["status"]: stage["lots"] for stage in board["funnel"]}
    assert funnel["Приём заявок идёт"] == 1
    assert funnel["Торги назначены"] == 2
    assert funnel["Торги прошли"] == 1
    assert funnel["Продано"] == 1

    types = {row["object_type_name"]: row for row in board["types"]}
    assert types["Квартира"]["lots"] == 1
    assert types["Машино-место"]["sold_lots"] == 1

    change = board["changes"][0]
    assert change["lot_id"] == live
    assert change["version"] == 2
    assert change["start_price"] == 9900000.0
    assert change["prev_start_price"] == 10600000.0
    assert change["price_down"] is True

    assert [b["lots"] for b in board["area_hist"]]
    assert {v["bucket"] for v in board["version_activity"]["versions"]} == {"1", "2"}
    assert board["deadlines"][0]["lot_id"] == live


async def test_objects_points(client, db):
    await seed_torgi_object(db, latitude="55.863126", longitude="37.559686")
    await seed_torgi_object(
        db, lot_id=17631160, object_type_name="Машино-место", start_price=1000000
    )
    await db.commit()

    points = (await client.get("/torgi/objects/points")).json()
    assert len(points) == 2
    quartile = next(p for p in points if p["object_type_name"] == "Квартира")
    assert quartile["latitude"] == "55.863126"
    assert quartile["is_live"] is True

    only_parking = (
        await client.get(
            "/torgi/objects/points", params={"object_type": "Машино-место"}
        )
    ).json()
    assert [p["lot_id"] for p in only_parking] == [17631160]


async def test_second_run_is_skipped_while_first_is_running():
    """Плановая джоба и ручной вызов не должны читать портал одновременно."""
    import asyncio

    from src import torgi_objects as mod

    service = mod.TorgiObjectsService()
    started = asyncio.Event()
    release = asyncio.Event()

    async def slow(_budget):
        started.set()
        await release.wait()
        return {"status": "success", "lots": 1, "details_fetched": 0, "details_pending": 0}

    service._update_all_data = slow  # type: ignore[method-assign]

    first = asyncio.create_task(service.update_all_data())
    await started.wait()
    second = await service.update_all_data()
    assert second["status"] == "busy"

    release.set()
    assert (await first)["status"] == "success"
    # замок отпущен — следующий прогон снова проходит
    started.clear()
    release.set()
    assert (await service.update_all_data())["status"] == "success"


async def test_cars_invest_segments_and_deals(client, db):
    """Транспорт: сегмент «категория × возраст» и живой лот дешевле типичного итога."""
    from sqlalchemy import text

    past = datetime.datetime.now() - datetime.timedelta(days=30)
    future = datetime.datetime.now() + datetime.timedelta(days=5)
    rows = [
        # 10 проданных 2018 года: итог 500 000 при старте 400 000 (наценка 25 %)
        *[
            dict(
                lot_id=7000 + i, status_text="Признаны состоявшимися",
                start_price=400000, final_price=500000, request_end_date=past,
            )
            for i in range(10)
        ],
        dict(lot_id=7100, status_text="Прием заявок", start_price=200000,
             final_price=None, request_end_date=future),
    ]
    for r in rows:
        await db.execute(
            text(
                "INSERT INTO torgi_lots (lot_id, version, transport_category, brand,"
                " year, status_text, start_price, final_price, request_end_date)"
                " VALUES (:lot_id, 1, 'Легковые автомобили', 'Ford', 2018, :status_text,"
                " :start_price, :final_price, :request_end_date)"
            ),
            r,
        )
    await db.commit()

    invest = (await client.get("/torgi/invest")).json()
    (segment,) = invest["segments"]
    assert segment["object_type_name"] == "Легковые автомобили"
    assert segment["region_name"] == "2015–2019"
    assert segment["sold"] == 10 and segment["median_final_ppm"] == 500000.0
    assert segment["live_lots"] == 1
    (deal,) = invest["deals"]
    assert deal["lot_id"] == 7100 and deal["bench_ppm"] == 500000.0
    assert deal["discount"] == 0.6
    assert (await client.get("/torgi/odds")).status_code == 200
