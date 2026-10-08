"""Сбор лотов torgi.mos.ru из разделов недвижимости и имущества.

Те же два эндпоинта портала, что и у транспорта (см. src/torgi.py), но без
фильтра по типу объекта: квартиры, комнаты, машино-места, нежилые помещения,
здания, земельные участки, территории, акции/доли. Транспорт отсюда исключён —
у него своя таблица со своим разбором госномеров.

Объём другой: в архиве портала ~280 тыс. лотов против 1,6 тыс. транспортных,
поэтому карточки читаются не для всех.

* список — весь архив пачками по PAGE_SIZE; только из списка приходят новые
  лоты, порядок выдачи портала не по дате, фильтра «что изменилось с такого-то
  числа» он не поддерживает (проверено), поэтому полный проход по списку
  делается каждый прогон. Он дешёвый: ~280 запросов;
* карточка — только для живых лотов: тех, где приём заявок ещё идёт или торги
  впереди, а также тех, где торги прошли недавно, а итоговой цены ещё нет.
  Архивные лоты карточками не перечитываются: их состояние уже не меняется.
"""

import asyncio
import datetime
import json

from aiohttp.http_exceptions import HttpBadRequest
from aiohttp_retry import ExponentialRetry, RetryClient
from loguru import logger
from sqlalchemy import text

from src.database import Session
from src.repository import (
    add_torgi_object_favorite,
    get_torgi_objects_breakdown,
    get_torgi_object_versions,
    get_torgi_objects,
    get_torgi_objects_stats,
    list_torgi_object_favorites,
    remove_torgi_object_favorite,
    upsert_with_except_from_temp_table,
)
from src.schemas import (
    TorgiObjectBreakdownRow,
    TorgiObjectFavoriteToggleResult,
    TorgiObjectRow,
    TorgiObjectSchema,
    TorgiObjectStat,
    TorgiObjectVersion,
    naive_utc,
)

PORTAL = "https://torgi.mos.ru"
API = "https://api.torgi.mos.ru"
LIST_URL = f"{API}/investmoscow/tender/v2/filtered-tenders/searchungroupedtenderobjects"
DETAIL_URL = f"{API}/investmoscow/tender/v1/object-info/gettenderobjectinformation"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Origin": PORTAL,
    "Referer": f"{PORTAL}/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
}

# транспорт собирает src/torgi.py — здесь он только мешал бы
TRANSPORT_TYPE_CODE = "nsi:41:99021071"

# портал отдаёт и 2000 за запрос, но на 1000 ответ приходит за ~15 с, что
# укладывается в таймаут и даёт 280 страниц на весь архив
PAGE_SIZE = 1000
LIST_CONCURRENCY = 4
DETAIL_CONCURRENCY = 8
# сколько дней после торгов ещё ждём появления итоговой цены в карточке
FINAL_PRICE_GRACE_DAYS = 30

# label в objectInfo карточки -> колонка torgi_objects. Весь objectInfo целиком
# всё равно складывается в details, здесь только то, по чему фильтруем и сортируем.
OBJECT_INFO_FIELDS = {
    "Кадастровый номер": "cadastral_number",
    "Год постройки": "build_year",
    "Тип дома": "house_type",
    "Функциональное назначение": "purpose",
}
PROCEDURE_INFO_FIELDS = {
    "Размер задатка": "deposit",
    "Шаг аукциона": "auction_step",
    "Итоговая цена": "final_price",
    "Ссылка на torgi.gov.ru": "torgi_gov_link",
}
# что приходит только из карточки: при переиспользовании старой карточки эти
# колонки копируются из БД, чтобы прогон без чтения карточки их не затирал
DETAIL_COLUMNS = (
    "status_text",
    "details",
    *OBJECT_INFO_FIELDS.values(),
    *PROCEDURE_INFO_FIELDS.values(),
)


def _coords(raw: str | None) -> tuple[str | None, str | None]:
    """coords приходит строкой "[55.717, 37.856]"."""
    if not raw:
        return None, None
    parts = raw.strip("[] ").split(",")
    if len(parts) != 2:
        return None, None
    return parts[0].strip() or None, parts[1].strip() or None


def _metro(raw) -> list[dict] | None:
    if not raw:
        return None
    stops = [
        {
            "name": stop.get("subwayStationName"),
            "walk": stop.get("walkingTime"),
            "transport": stop.get("publicTransportTime"),
        }
        for stop in raw
        if stop.get("subwayStationName")
    ]
    return stops or None


def _lot_columns(lot: dict) -> dict:
    latitude, longitude = _coords(lot.get("coords"))
    floors = lot.get("roomFloors") or []
    return {
        "lot_id": lot["id"],
        "object_type_code": lot.get("objectTypeCode"),
        "object_type_name": lot.get("objectTypeName"),
        "tender_type_code": lot.get("typeCode"),
        "name": lot.get("name") or lot.get("tradeName"),
        "url": PORTAL + lot["url"] if lot.get("url") else None,
        "address": lot.get("address"),
        "short_address": lot.get("shortAddress"),
        "object_address": lot.get("objectAddress"),
        "region_name": lot.get("regionName"),
        "district_name": lot.get("districtName"),
        "unom": lot.get("unom"),
        "object_area": lot.get("objectArea") or lot.get("area"),
        "living_area": lot.get("livingArea"),
        "kitchen_area": lot.get("kitchenArea"),
        "rooms_count": lot.get("roomsCount"),
        # roomFloors — список этажей объекта, для квартиры в нём один элемент
        "room_floor": floors[0] if floors else None,
        "floors": lot.get("floors"),
        "start_price": lot.get("startPrice"),
        "price_per_square": lot.get("pricePerSquare"),
        "request_start_date": lot.get("requestStartDate"),
        "request_end_date": lot.get("requestEndDate"),
        "tender_date": lot.get("tenderDate"),
        "final_date": lot.get("finalDate"),
        "platform_link": lot.get("platformLink"),
        "latitude": latitude,
        "longitude": longitude,
        "photos": [
            PORTAL + pic["url"]
            for pic in lot.get("attachedPics") or []
            if pic.get("url")
        ],
        "metro": _metro(lot.get("subwayStations")),
        "portal_views": lot.get("portalViews"),
        "source_updated_at": lot.get("updateDate"),
    }


def _detail_columns(detail: dict) -> dict:
    status = (detail.get("sidebar") or {}).get("tenderStatusInfo") or {}
    info = {
        item["label"]: item.get("value")
        for item in detail.get("objectInfo") or []
        if item.get("label")
    }
    row: dict = {"status_text": status.get("statusText"), "details": info or None}
    for label, column in OBJECT_INFO_FIELDS.items():
        if label in info:
            row[column] = info[label]
    for item in detail.get("procedureInfo") or []:
        column = PROCEDURE_INFO_FIELDS.get(item.get("label"))
        if column:
            row[column] = item.get("value")
    return row


def _jsonb(row: dict) -> dict:
    """asyncpg кодирует jsonb только из строки, dict/list он не принимает."""
    for column in ("metro", "details"):
        if row.get(column) is not None:
            row[column] = json.dumps(row[column], ensure_ascii=False)
    return row


class TorgiObjectsService:
    # fmt: off
    LOT_COLUMNS = [
        "lot_id", "object_type_code", "object_type_name", "tender_type_code", "name",
        "url", "address", "short_address", "object_address", "region_name",
        "district_name", "unom", "object_area", "living_area", "kitchen_area",
        "rooms_count", "room_floor", "floors", "start_price", "price_per_square",
        "request_start_date", "request_end_date", "tender_date", "final_date",
        "platform_link", "torgi_gov_link", "latitude", "longitude", "photos", "metro",
        "status_text", "cadastral_number", "build_year", "house_type", "purpose",
        "deposit", "auction_step", "final_price", "details", "portal_views",
        "source_updated_at", "detail_fetched_at",
    ]
    # fmt: on

    # --- портал ------------------------------------------------------------

    async def iter_pages(self):
        """Страницы списка пачками по LIST_CONCURRENCY.

        Генератор, а не один большой список: архив портала — 280 страниц по
        1000 лотов, в памяти это гигабайты сырых словарей. Каждая пачка сразу
        уходит в БД, и прогон виден по строкам в таблице, а не только в конце.
        """
        retry_options = ExponentialRetry(attempts=3)

        async with RetryClient(
            raise_for_status=False, retry_options=retry_options, headers=HEADERS
        ) as client:

            async def page(number: int) -> tuple[int, list[dict]]:
                body = {"pageNumber": number, "pageSize": PAGE_SIZE}
                async with client.post(LIST_URL, json=body) as response:
                    if response.status != 200:
                        logger.error(
                            f"torgi objects list {response.status}: "
                            f"{await response.text()}"
                        )
                        raise HttpBadRequest(f"torgi objects list {response.status}")
                    data = await response.json()
                return data.get("totalCount") or 0, data.get("entities") or []

            total, entities = await page(1)
            pages = -(-total // PAGE_SIZE) if total else 1
            logger.info(f"torgi objects: всего {total} лотов, {pages} страниц")
            yield 1, pages, self._without_transport(entities)

            for start in range(2, pages + 1, LIST_CONCURRENCY):
                batch = range(start, min(start + LIST_CONCURRENCY, pages + 1))
                results = await asyncio.gather(*(page(n) for n in batch))
                lots: list[dict] = []
                for _, rows in results:
                    lots.extend(self._without_transport(rows))
                yield batch[-1], pages, lots

    @staticmethod
    def _without_transport(lots: list[dict]) -> list[dict]:
        """Транспорт собирает src/torgi.py — здесь он только мешал бы."""
        return [
            lot for lot in lots if lot.get("objectTypeCode") != TRANSPORT_TYPE_CODE
        ]

    async def fetch_details(self, lot_ids: list[int]) -> dict[int, dict]:
        if not lot_ids:
            return {}
        semaphore = asyncio.Semaphore(DETAIL_CONCURRENCY)
        retry_options = ExponentialRetry(attempts=3)
        details: dict[int, dict] = {}

        async with RetryClient(
            raise_for_status=False, retry_options=retry_options, headers=HEADERS
        ) as client:

            async def one(lot_id: int) -> None:
                async with semaphore:
                    async with client.get(
                        DETAIL_URL, params={"tenderId": lot_id}
                    ) as response:
                        if response.status != 200:
                            logger.warning(
                                f"torgi object detail {lot_id}: {response.status}"
                            )
                            return
                        details[lot_id] = await response.json()

            await asyncio.gather(*(one(lot_id) for lot_id in lot_ids))

        logger.info(
            f"torgi objects: {len(details)}/{len(lot_ids)} карточек получено"
        )
        return details

    # --- обновление --------------------------------------------------------

    @staticmethod
    async def _known_lots(lot_ids: list[int]) -> dict[int, dict]:
        """Что уже лежит в БД по лотам этой страницы — только три поля, по
        которым решается, читать ли карточку. Поля самой карточки в память не
        тянем: прогон без карточки пишет по ним NULL, а upsert их сохраняет
        (coalesce_columns, см. src/utils.py)."""
        if not lot_ids:
            return {}
        async with Session() as session:
            result = await session.execute(
                text(
                    "SELECT lot_id, source_updated_at, detail_fetched_at, final_price"
                    " FROM torgi_objects WHERE lot_id = ANY(:ids)"
                ),
                {"ids": lot_ids},
            )
            return {row["lot_id"]: dict(row) for row in result.mappings().all()}

    @staticmethod
    def _is_live(lot: dict, now: datetime.datetime) -> bool:
        """Лот ещё в игре: приём заявок идёт или торги впереди."""
        request_end = naive_utc(lot.get("requestEndDate"))
        tender = naive_utc(lot.get("tenderDate"))
        return (request_end is not None and request_end > now) or (
            tender is not None and tender > now
        )

    @classmethod
    def _detail_queue(
        cls, lots: list[dict], known: dict[int, dict], now: datetime.datetime
    ) -> tuple[list[int], list[int]]:
        """Кого читать карточкой сейчас и сколько ещё осталось дочитать.

        Три очереди по убыванию важности:

        1. живые лоты, у которых карточки нет или портал сдвинул updateDate —
           именно по ним меняются статус, цена и сроки;
        2. недавно отторгованные без итоговой цены — один дочитывающий заход;
        3. всё остальное без карточки, включая архив: разбирается постепенно,
           прогон за прогоном. Уже прочитанный архив не перечитывается никогда —
           его состояние не меняется.
        """
        live, finished, backfill = [], [], []
        for lot in lots:
            previous = known.get(lot["id"])
            enriched = previous is not None and previous.get("detail_fetched_at")
            if cls._is_live(lot, now):
                if not enriched or previous.get("source_updated_at") != naive_utc(
                    lot.get("updateDate")
                ):
                    live.append(lot["id"])
                continue
            tender = naive_utc(lot.get("tenderDate"))
            if (
                enriched
                and tender is not None
                and (now - tender).days <= FINAL_PRICE_GRACE_DAYS
                and previous.get("final_price") is None
            ):
                finished.append(lot["id"])
            elif not enriched:
                backfill.append(lot["id"])
        return [*live, *finished, *backfill], backfill

    async def update_all_data(self, detail_budget: int | None = None) -> dict:
        """Один прогон: список постранично, карточки по очереди из _detail_queue.

        Страница читается — страница пишется: лоты появляются в таблице по
        ходу прогона, а не одним куском в конце, и память не растёт на весь
        архив. detail_budget ограничивает число карточек за прогон: живые лоты
        стоят в очереди первыми и под бюджет попадают всегда, архив
        дочитывается в следующие прогоны.
        """
        now = datetime.datetime.now()
        budget = detail_budget
        written = 0
        details_total = 0
        pending = 0

        async for last_page, pages, lots in self.iter_pages():
            if not lots:
                continue
            known = await self._known_lots([lot["id"] for lot in lots])
            queue, _ = self._detail_queue(lots, known, now)
            if budget is not None:
                if len(queue) > budget:
                    pending += len(queue) - budget
                    queue = queue[:budget]
                budget -= len(queue)

            details = await self.fetch_details(queue) if queue else {}
            details_total += len(details)

            rows = []
            for lot in lots:
                row = _lot_columns(lot)
                detail = details.get(lot["id"])
                if detail is not None:
                    row.update(_detail_columns(detail))
                    row["detail_fetched_at"] = now
                # карточку не читали — поля карточки уходят NULL, прежние
                # значения сохранит COALESCE в upsert
                rows.append(_jsonb(TorgiObjectSchema.model_validate(row).model_dump()))

            async with Session() as session:
                async with session.begin():
                    await upsert_with_except_from_temp_table(
                        table="torgi_objects",
                        temp_table="torgi_objects_temp",
                        columns=self.LOT_COLUMNS,
                        on_conflict_column="lot_id",
                        data=rows,
                        session=session,
                        # detail_fetched_at тоже сохраняем: иначе прогон по
                        # списку обнулил бы отметку и архив вставал бы в
                        # очередь на карточку снова и снова
                        coalesce_columns=(*DETAIL_COLUMNS, "detail_fetched_at"),
                    )
            written += len(rows)
            logger.info(
                f"torgi objects: страница {last_page}/{pages}, записано "
                f"{written} лотов, карточек {details_total}"
            )

        if pending:
            logger.info(
                f"torgi objects: бюджет карточек исчерпан, не дочитано "
                f"{pending} — разберём в следующие прогоны"
            )
        logger.info(f"torgi objects: записано {written} лотов")
        return {
            "status": "success",
            "lots": written,
            "details_fetched": details_total,
            "details_pending": pending,
        }

    # --- чтение ------------------------------------------------------------

    async def list_objects(self, **filters) -> list[TorgiObjectRow]:
        async with Session() as session:
            rows = await get_torgi_objects(session=session, **filters)
        return [TorgiObjectRow.model_validate(dict(row)) for row in rows]

    async def get_object(self, lot_id: int) -> TorgiObjectRow | None:
        rows = await self.list_objects(lot_id=lot_id, limit=1)
        return rows[0] if rows else None

    # измерения разреза: ключ из запроса проверяется по этому словарю, в SQL
    # подставляется только выражение отсюда
    BREAKDOWN_DIMS = {
        "region": "o.region_name",
        "district": "o.district_name",
        "object_type": "o.object_type_name",
        "house_type": "o.house_type",
        "rooms": "o.rooms_count::text",
    }

    async def get_breakdown(
        self, dimension: str, object_type: str | None = None
    ) -> list[TorgiObjectBreakdownRow]:
        dimension_sql = self.BREAKDOWN_DIMS[dimension]
        async with Session() as session:
            rows = await get_torgi_objects_breakdown(
                dimension_sql=dimension_sql,
                object_type=object_type,
                session=session,
            )
        return [TorgiObjectBreakdownRow.model_validate(dict(row)) for row in rows]

    async def get_stats(self) -> list[TorgiObjectStat]:
        async with Session() as session:
            rows = await get_torgi_objects_stats(session=session)
        return [TorgiObjectStat.model_validate(dict(row)) for row in rows]

    async def get_versions(self, lot_id: int) -> list[TorgiObjectVersion]:
        async with Session() as session:
            rows = await get_torgi_object_versions(lot_id=lot_id, session=session)
        return [TorgiObjectVersion.model_validate(dict(row)) for row in rows]

    async def list_favorites(self) -> list[int]:
        async with Session() as session:
            return await list_torgi_object_favorites(session=session)

    async def add_favorite(self, lot_id: int) -> TorgiObjectFavoriteToggleResult:
        async with Session() as session, session.begin():
            await add_torgi_object_favorite(lot_id=lot_id, session=session)
        return TorgiObjectFavoriteToggleResult(lot_id=lot_id, is_favorite=True)

    async def remove_favorite(self, lot_id: int) -> TorgiObjectFavoriteToggleResult:
        async with Session() as session, session.begin():
            await remove_torgi_object_favorite(lot_id=lot_id, session=session)
        return TorgiObjectFavoriteToggleResult(lot_id=lot_id, is_favorite=False)
