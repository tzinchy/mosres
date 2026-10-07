"""Сбор лотов с torgi.mos.ru (раздел «Транспортные средства»).

Портал отдаёт данные двумя непубличными, но открытыми эндпоинтами (ни авторизации,
ни кук):

* POST /investmoscow/tender/v2/filtered-tenders/searchungroupedtenderobjects —
  плоский список лотов; без фильтра по статусу это весь архив (~1600 лотов),
  сам сайт показывает только те, у которых открыт приём заявок (~66);
* GET  /investmoscow/tender/v1/object-info/gettenderobjectinformation?tenderId= —
  карточка лота: статус, госномер, VIN, задаток, шаг аукциона, итоговая цена.

Карточку дёргаем только для новых лотов и для тех, у которых портал сдвинул
updateDate — иначе каждое обновление стоило бы ~1600 запросов.
"""

import asyncio
import datetime

import polars as pl

from aiohttp.http_exceptions import HttpBadRequest
from aiohttp_retry import ExponentialRetry, RetryClient
from loguru import logger
from sqlalchemy import text

from src.config import EXCEL_FOLDER
from src.database import Session
from src.plates import PRESETS, mask_to_regex, parse_plate, validate_mask
from src.repository import (
    add_plate_watch,
    add_torgi_favorite,
    delete_plate_watch,
    get_plate_watch,
    get_torgi_block,
    get_torgi_lot_history,
    get_torgi_lots,
    get_torgi_pivot,
    get_torgi_stats,
    list_plate_watches,
    list_torgi_favorites,
    remove_torgi_favorite,
    upsert_with_except_from_temp_table,
)
from src.schemas import (
    PlatePreset,
    PlateWatch,
    TorgiBrandStat,
    TorgiCategoryStat,
    TorgiChange,
    TorgiDashboard,
    TorgiDataQuality,
    TorgiDeadlineRow,
    TorgiFavoriteToggleResult,
    TorgiFunnelStage,
    TorgiHistBin,
    TorgiKpi,
    TorgiLotRow,
    TorgiLotSchema,
    TorgiLotVersion,
    TorgiNotification,
    TorgiPivotRow,
    TorgiPlateFlavor,
    TorgiPoint,
    TorgiSeasonPoint,
    TorgiTimePoint,
    TorgiTopLot,
    TorgiVersionActivity,
    TorgiVersionBin,
    TorgiVersionDay,
    naive_utc,
)

PORTAL = "https://torgi.mos.ru"
API = "https://api.torgi.mos.ru"
LIST_URL = f"{API}/investmoscow/tender/v2/filtered-tenders/searchungroupedtenderobjects"
DETAIL_URL = f"{API}/investmoscow/tender/v1/object-info/gettenderobjectinformation"

# objectTypes из фильтра самого портала (transport/prodazha/transportnye-sredstva).
# Фильтр по tenderStatus не ставим: нужен весь архив, а не только приём заявок.
TRANSPORT_FILTER = {"objectTypes": ["nsi:41:99021071"]}
PAGE_SIZE = 100
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Origin": PORTAL,
    "Referer": f"{PORTAL}/transport/prodazha/transportnye-sredstva/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
}
# карточки лотов тянем параллельно, но не больше — портал отдаёт ~3 req/s без 429
DETAIL_CONCURRENCY = 8

# label в objectInfo карточки -> колонка torgi_lots
OBJECT_INFO_FIELDS = {
    "Категория транспорта": "transport_category",
    "Марка": "brand",
    "Модель": "model",
    "Год выпуска": "year",
    "Государственный регистрационный знак": "plate",
    "VIN номер": "vin",
    "Наличие ПТС": "pts",
    "Цвет": "color",
    "Тип кузова": "body",
    "Экологический класс": "eco_class",
    "Мощность двигателя": "power",
    "Объем двигателя": "engine_volume",
    "Привод": "drive",
    "Коробка передач": "transmission",
    "Пробег, км": "mileage",
}
# label в procedureInfo карточки -> колонка torgi_lots
PROCEDURE_INFO_FIELDS = {
    "Размер задатка": "deposit",
    "Шаг аукциона": "auction_step",
    "Итоговая цена": "final_price",
    "Ссылка на torgi.gov.ru": "torgi_gov_link",
}
# разбор госномера считается здесь, при загрузке, а не выражением в SQL:
# один источник правды, и история версий хранит ровно то, что видел портал
PLATE_COLUMNS = ("plate_norm", "plate_region", "plate_valid")
# что берём из карточки — при переиспользовании старой карточки эти же колонки
# копируются из БД, чтобы не ходить в портал за неизменившимся лотом
DETAIL_COLUMNS = (
    "status_text",
    "video_link",
    *OBJECT_INFO_FIELDS.values(),
    *PROCEDURE_INFO_FIELDS.values(),
    *PLATE_COLUMNS,
)


def _coords(raw: str | None) -> tuple[str | None, str | None]:
    """coords приходит строкой "[55.717, 37.856]"."""
    if not raw:
        return None, None
    parts = raw.strip("[] ").split(",")
    if len(parts) != 2:
        return None, None
    return parts[0].strip() or None, parts[1].strip() or None


def _lot_columns(lot: dict) -> dict:
    latitude, longitude = _coords(lot.get("coords"))
    return {
        "lot_id": lot["id"],
        "name": lot.get("name") or lot.get("tradeName"),
        "url": PORTAL + lot["url"] if lot.get("url") else None,
        "start_price": lot.get("startPrice"),
        "mileage": lot.get("mileage"),
        "drive": lot.get("drive"),
        "transmission": lot.get("transmission"),
        "engine_volume": lot.get("engine"),
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
        "portal_views": lot.get("portalViews"),
        "source_updated_at": lot.get("updateDate"),
    }


def _detail_columns(detail: dict) -> dict:
    status = (detail.get("sidebar") or {}).get("tenderStatusInfo") or {}
    row: dict = {
        "status_text": status.get("statusText"),
        "video_link": detail.get("linkVideo") or None,
    }
    for item in detail.get("objectInfo") or []:
        column = OBJECT_INFO_FIELDS.get(item.get("label"))
        if column:
            row[column] = item.get("value")
    for item in detail.get("procedureInfo") or []:
        column = PROCEDURE_INFO_FIELDS.get(item.get("label"))
        if column:
            row[column] = item.get("value")
    parts = parse_plate(row.get("plate"))
    row["plate_norm"] = parts.plate_norm
    row["plate_region"] = parts.plate_region
    row["plate_valid"] = parts.plate_valid
    return row


class TorgiService:
    # fmt: off
    LOT_COLUMNS = [
        "lot_id", "name", "url", "status_text", "transport_category", "brand", "model",
        "year", "plate", "plate_norm", "plate_region", "plate_valid",
        "vin", "pts", "color", "body", "eco_class", "power",
        "engine_volume", "drive", "transmission", "mileage", "start_price", "deposit",
        "auction_step", "final_price", "request_start_date", "request_end_date",
        "tender_date", "final_date", "platform_link", "torgi_gov_link", "video_link",
        "latitude", "longitude", "photos", "portal_views", "source_updated_at",
    ]
    # fmt: on

    EXPORT_COLUMNS = {
        "lot_id": "ID лота",
        "name": "Название",
        "status_text": "Статус",
        "transport_category": "Категория",
        "brand": "Марка",
        "model": "Модель",
        "year": "Год",
        "plate": "Госномер",
        "plate_norm": "Госномер (норма)",
        "plate_region": "Регион номера",
        "vin": "VIN",
        "pts": "ПТС",
        "mileage": "Пробег, км",
        "power": "Мощность",
        "engine_volume": "Объём двигателя",
        "transmission": "КПП",
        "drive": "Привод",
        "color": "Цвет",
        "body": "Тип кузова",
        "eco_class": "Экологический класс",
        "start_price": "Начальная цена, ₽",
        "start_price_prev": "Начальная цена прошлой версии, ₽",
        "start_price_delta_pct": "Δ начальной, %",
        "deposit": "Задаток, ₽",
        "auction_step": "Шаг аукциона, ₽",
        "final_price": "Итоговая цена, ₽",
        "final_price_delta_pct": "Δ итог/начало, %",
        "request_start_date": "Приём заявок с",
        "request_end_date": "Приём заявок до",
        "days_left": "Дней осталось",
        "tender_date": "Торги",
        "platform_link": "ЭТП",
        "torgi_gov_link": "torgi.gov.ru",
        "video_link": "Видео",
        "photos_count": "Фото, шт.",
        "portal_views": "Просмотров",
        "torgi_url": "Ссылка",
        "version": "Версия",
        "updated_at": "Обновлено",
    }

    # --- портал ------------------------------------------------------------

    async def fetch_lots(self) -> list[dict]:
        """Весь архив транспортных лотов одной пачкой страниц по PAGE_SIZE."""
        body = dict(TRANSPORT_FILTER, pageNumber=1, pageSize=PAGE_SIZE)
        lots: dict[int, dict] = {}
        retry_options = ExponentialRetry(attempts=3)
        async with RetryClient(
            raise_for_status=False, retry_options=retry_options, headers=HEADERS
        ) as client:
            while True:
                async with client.post(LIST_URL, json=body) as response:
                    if response.status != 200:
                        logger.error(
                            f"torgi list {response.status}: {await response.text()}"
                        )
                        raise HttpBadRequest()
                    page = await response.json()
                total = page.get("totalCount") or 0
                entities = page.get("entities") or []
                new = [lot for lot in entities if lot["id"] not in lots]
                lots.update({lot["id"]: lot for lot in new})
                # страница без новых id = портал закольцевал выдачу, дальше смысла нет
                if not new or len(lots) >= total:
                    logger.info(f"torgi: {len(lots)}/{total} лотов в списке")
                    return list(lots.values())
                body["pageNumber"] += 1

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
                                f"torgi detail {lot_id}: {response.status}"
                            )
                            return
                        details[lot_id] = await response.json()

            await asyncio.gather(*(one(lot_id) for lot_id in lot_ids))

        logger.info(f"torgi: {len(details)}/{len(lot_ids)} карточек получено")
        return details

    async def _known_lots(self) -> dict[int, dict]:
        """lot_id -> source_updated_at + колонки из карточки, уже лежащие в БД."""
        columns = ", ".join(("lot_id", "source_updated_at", *DETAIL_COLUMNS))
        async with Session() as session:
            result = await session.execute(text(f"SELECT {columns} FROM torgi_lots"))
            return {row["lot_id"]: dict(row) for row in result.mappings().all()}

    async def update_all_data(self) -> dict:
        lots = await self.fetch_lots()
        known = await self._known_lots()

        stale: list[int] = []
        for lot in lots:
            previous = known.get(lot["id"])
            updated_at = naive_utc(lot.get("updateDate"))
            if previous is None or previous["source_updated_at"] != updated_at:
                stale.append(lot["id"])

        details = await self.fetch_details(stale)

        rows = []
        for lot in lots:
            row = _lot_columns(lot)
            detail = details.get(lot["id"])
            if detail is not None:
                row.update(_detail_columns(detail))
            else:
                # карточка не менялась (или не ответила) — переносим её поля из
                # БД, не затирая то, что и так пришло списком
                previous = known.get(lot["id"]) or {}
                row.update(
                    {
                        column: previous[column]
                        for column in DETAIL_COLUMNS
                        if previous.get(column) is not None
                    }
                )
            rows.append(TorgiLotSchema.model_validate(row).model_dump())

        async with Session() as session:
            async with session.begin():
                await upsert_with_except_from_temp_table(
                    table="torgi_lots",
                    temp_table="torgi_lots_temp",
                    columns=self.LOT_COLUMNS,
                    on_conflict_column="lot_id",
                    data=rows,
                    session=session,
                )
        logger.info(f"torgi: записано {len(rows)} лотов")
        return {"status": "success", "lots": len(rows), "details_fetched": len(details)}

    # --- чтение ------------------------------------------------------------

    # измерения /torgi/pivot: ключ подставляется в SQL, поэтому только отсюда,
    # никогда из пользовательского ввода (роут проверяет имя по этому словарю)
    PIVOT_DIMS = {
        "transport_category": "COALESCE(tl.transport_category, 'Без категории')",
        "brand": "COALESCE(tl.brand, 'Без марки')",
        "model": "COALESCE(tl.model, 'Без модели')",
        "year": "COALESCE(tl.year::text, 'не указан')",
        "color": "COALESCE(tl.color, 'не указан')",
        "body": "COALESCE(tl.body, 'не указан')",
        "eco_class": "COALESCE(tl.eco_class, 'не указан')",
        "drive": "COALESCE(tl.drive, 'не указан')",
        "transmission": "COALESCE(tl.transmission, 'не указана')",
        "pts": "COALESCE(tl.pts, 'не указано')",
        "status_text": "COALESCE(tl.status_text, 'без статуса')",
        "plate_region": "COALESCE(tl.plate_region, 'без региона')",
    }

    async def get_lots_table(
        self,
        *,
        lot_id: int | None = None,
        open_only: bool = False,
        status: str | None = None,
        category: str | None = None,
        brand: str | None = None,
        year_min: int | None = None,
        year_max: int | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        max_mileage: int | None = None,
        price_drop_only: bool = False,
        with_plate_only: bool = False,
        fav_only: bool = False,
        watch_only: bool = False,
        valid_plate_only: bool = False,
        plate_region: str | None = None,
        q: str | None = None,
    ) -> list[TorgiLotRow]:
        async with Session() as session:
            rows = await get_torgi_lots(
                lot_id=lot_id,
                open_only=open_only,
                status=status,
                category=category,
                brand=brand,
                year_min=year_min,
                year_max=year_max,
                min_price=min_price,
                max_price=max_price,
                max_mileage=max_mileage,
                price_drop_only=price_drop_only,
                with_plate_only=with_plate_only,
                fav_only=fav_only,
                watch_only=watch_only,
                valid_plate_only=valid_plate_only,
                plate_region=plate_region,
                q=q,
                session=session,
            )
        return [TorgiLotRow.model_validate(dict(row)) for row in rows]

    async def get_lot_history(self, lot_id: int) -> list[TorgiLotVersion]:
        async with Session() as session:
            rows = await get_torgi_lot_history(lot_id=lot_id, session=session)
        return [TorgiLotVersion.model_validate(dict(row)) for row in rows]

    async def get_stats(self) -> list[TorgiCategoryStat]:
        async with Session() as session:
            rows = await get_torgi_stats(session=session)
        return [TorgiCategoryStat.model_validate(dict(row)) for row in rows]

    # --- избранное ---------------------------------------------------------

    async def list_favorites(self) -> list[int]:
        async with Session() as session:
            return await list_torgi_favorites(session=session)

    async def add_favorite(self, lot_id: int) -> TorgiFavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await add_torgi_favorite(lot_id=lot_id, session=session)
        return TorgiFavoriteToggleResult(lot_id=lot_id, is_favorite=True)

    async def remove_favorite(self, lot_id: int) -> TorgiFavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await remove_torgi_favorite(lot_id=lot_id, session=session)
        return TorgiFavoriteToggleResult(lot_id=lot_id, is_favorite=False)

    # --- паттерны номеров --------------------------------------------------

    @staticmethod
    def list_presets() -> list[PlatePreset]:
        """Ключ PRESETS и есть человекочитаемый label — он же передаётся в POST."""
        return [PlatePreset(preset=name, label=name) for name in PRESETS]

    async def list_watches(self) -> list[PlateWatch]:
        async with Session() as session:
            rows = await list_plate_watches(session=session)
        return [PlateWatch.model_validate(dict(row)) for row in rows]

    async def add_watch(
        self,
        *,
        mask: str | None = None,
        preset: str | None = None,
        label: str | None = None,
    ) -> PlateWatch:
        """Маска или пресет. Кривая маска / неизвестный пресет — ValueError,
        роут превращает его в 422. Дубликат (user_id, regex) идемпотентен:
        возвращается существующий паттерн, новый label его переименовывает."""
        if preset:
            if preset not in PRESETS:
                raise ValueError(f"Неизвестный пресет: {preset}")
            regex, mask, label = PRESETS[preset], None, label or preset
        elif mask:
            validate_mask(mask)
            regex = mask_to_regex(mask)
        else:
            raise ValueError("Нужна маска (mask) или пресет (preset)")

        async with Session() as session:
            async with session.begin():
                watch_id = await add_plate_watch(
                    mask=mask, regex=regex, label=label, session=session
                )
            row = await get_plate_watch(watch_id=watch_id, session=session)
        return PlateWatch.model_validate(dict(row))

    async def delete_watch(self, watch_id: int) -> bool:
        async with Session() as session:
            async with session.begin():
                return bool(
                    await delete_plate_watch(watch_id=watch_id, session=session)
                )

    # --- уведомления, дашборд, разбивки ------------------------------------

    async def get_notifications(self, days: int = 30) -> list[TorgiNotification]:
        async with Session() as session:
            rows = await get_torgi_block(
                "torgi_notifications", days=days, session=session
            )
        return [TorgiNotification.model_validate(dict(row)) for row in rows]

    async def get_dashboard(self) -> TorgiDashboard:
        presets = list(PRESETS)
        regexes = [PRESETS[name] for name in presets]
        async with Session() as session:
            kpi_row = dict(
                (
                    await get_torgi_block(
                        "torgi_dashboard", preset_regexes=regexes, session=session
                    )
                )[0]
            )
            categories = await get_torgi_stats(session=session)
            brands = await get_torgi_block("torgi_brands", session=session)
            funnel = await get_torgi_block("torgi_funnel", session=session)
            timeseries = await get_torgi_block("torgi_timeseries", session=session)
            deadlines = await get_torgi_block("torgi_deadlines", session=session)
            changes = await get_torgi_block("torgi_changes", session=session)
            hists = await get_torgi_block("torgi_hists", session=session)
            tops = await get_torgi_block("torgi_tops", session=session)
            versions = await get_torgi_block("torgi_versions", session=session)
            flavors = await get_torgi_block(
                "torgi_plate_flavors", presets=presets, regexes=regexes, session=session
            )

        def hist(kind: str) -> list[TorgiHistBin]:
            return [
                TorgiHistBin.model_validate(dict(r)) for r in hists if r["kind"] == kind
            ]

        def top(kind: str) -> list[TorgiTopLot]:
            return [
                TorgiTopLot.model_validate(dict(r)) for r in tops if r["kind"] == kind
            ]

        # сезонность — агрегат того же месячного ряда по месяцу года
        season: dict[int, int] = {}
        for row in timeseries:
            season[row["month"].month] = season.get(row["month"].month, 0) + row["lots"]

        return TorgiDashboard(
            last_refresh=kpi_row["last_refresh"],
            kpi=TorgiKpi.model_validate(kpi_row),
            data_quality=TorgiDataQuality.model_validate(kpi_row),
            categories=[TorgiCategoryStat.model_validate(dict(r)) for r in categories],
            brands=[TorgiBrandStat.model_validate(dict(r)) for r in brands],
            funnel=[TorgiFunnelStage.model_validate(dict(r)) for r in funnel],
            timeseries=[TorgiTimePoint.model_validate(dict(r)) for r in timeseries],
            seasonality=[
                TorgiSeasonPoint(month_of_year=month, lots=lots)
                for month, lots in sorted(season.items())
            ],
            deadlines=[TorgiDeadlineRow.model_validate(dict(r)) for r in deadlines],
            changes=[TorgiChange.model_validate(dict(r)) for r in changes],
            discount_hist=hist("discount"),
            year_hist=hist("year"),
            mileage_hist=hist("mileage"),
            top_drop=top("top_drop"),
            top_premium=top("top_premium"),
            top_views=top("top_views"),
            plate_flavors=[TorgiPlateFlavor.model_validate(dict(r)) for r in flavors],
            version_activity=TorgiVersionActivity(
                versions=[
                    TorgiVersionBin(bucket=str(r["versions"]), lots=r["lots"])
                    for r in versions
                    if r["day"] is None
                ],
                changes_by_day=[
                    TorgiVersionDay(day=r["day"], changes=r["lots"])
                    for r in versions
                    if r["day"] is not None
                ],
            ),
        )

    async def get_pivot(self, dimension: str) -> list[TorgiPivotRow]:
        key_expr = self.PIVOT_DIMS[dimension]
        async with Session() as session:
            rows = await get_torgi_pivot(key_expr=key_expr, session=session)
        return [TorgiPivotRow.model_validate(dict(row)) for row in rows]

    async def get_points(self) -> list[TorgiPoint]:
        async with Session() as session:
            rows = await get_torgi_block("torgi_points", session=session)
        return [TorgiPoint.model_validate(dict(row)) for row in rows]

    async def get_excel_file(self, **filters) -> tuple[str, str]:
        rows = await self.get_lots_table(**filters)
        frame = pl.DataFrame(
            [
                {
                    title: getattr(row, field)
                    for field, title in self.EXPORT_COLUMNS.items()
                }
                for row in rows
            ],
            schema=list(self.EXPORT_COLUMNS.values()),
        )
        file_name = f"torgi-{datetime.date.today():%Y-%m-%d}.xlsx"
        file_path = EXCEL_FOLDER.joinpath(file_name)
        frame.write_excel(file_path)
        return str(file_path), file_name
