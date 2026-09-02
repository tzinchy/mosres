import datetime

from src.config import EXCEL_FOLDER, settings
from loguru import logger
import pandas as pd
from aiohttp_retry import ExponentialRetry, RetryClient
from src.database import Session
from src.schemas import (
    ApartRow,
    BuildingRow,
    BuildingStat,
    FavoriteToggleResult,
    DashboardMetrics,
    DashboardPoint,
    RefreshStatus,
    BuildingSchema,
    DistrictAdapter,
    MetroAdapter,
    MetroSchemaForInsert,
    NewApartSchema,
    MunicipalDistrictSchemaForInsert,
    DistrictSchemaForInsert,
)
from src.repository import (
    insert_into_table,
    upsert_with_except_from_temp_table,
    get_buildings_apartments,
    get_new_aparts_history,
    get_buildings_history,
    get_buildings_table,
    get_aparts_table,
    add_favorite,
    remove_favorite,
    list_favorites,
    refresh_building_price_stats,
    get_building_price_dynamics,
    get_dashboard_metrics,
    get_dashboard_timeseries,
    get_buildings_stats,
    record_refresh_run,
    get_last_refresh,
)
import asyncio
from aiohttp.http_exceptions import HttpBadRequest

BASE_URL = (
    "https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php"
)

APART_AND_BUILDINGS_PARAMS = {"type[]": ["R"], "pagesize": 1_000_000}

FILTER_PARAMS = {"cmd": "filters", "pagesize": 1_000_000}


class MosResService:
    # fmt: off
    BUILDING_COLUMNS = [
        "building_id", "address", "code", "district", "latitude", "longitude", "status_code",
        "finishing_code", "metro", "metro_car", "metro_walk", "floors", "flats", "vvod",
        "anons_texts", "family_hypotec", "county", "img", "gallery",
    ]
    NEW_APARTS_COLUMNS = [
        "new_apart_id", "address", "building", "building_id", "building_code", "number", "rooms", "floor",
        "block", "area", "price", "price_m", "type", "term_of_application", "open_sale", "reserve", "y2_sell", "for_sell", "num_on_floor",
        "property", "advants", "article", "price_with_discount", "percentage_discount",
        "auction", "block_name", "plan", "plan_s", "tour_3d",
    ]
    MUNICIPAL_DISTRICT_COLUMNS = ["municipal_district_id", "name", "polygons"]

    DISTRICT_COLUMNS = ["district_id", "name", "full_name", "polygons"]

    METRO_COLUMNS = ['metro_id', 'name', 'color']
    # fmt: on

    async def update_all_data(self):
        async with Session() as session:
            async with session.begin():
                logger.info("insert districts")
                metro_res, buildings_res = await asyncio.gather(
                    self.get_metro_district_municipal_district(),
                    self.get_building_and_aparts()
                )

                metro_data, district_data, municipal_district_data = metro_res
                buildings_data, new_aparts_data = buildings_res

                await insert_into_table(
                    table="districts",
                    columns=self.DISTRICT_COLUMNS,
                    on_conflict_column="district_id",
                    data=district_data,
                    session=session,
                )

                logger.info("insert district complete")
                logger.info("insert municipal_districts")

                await insert_into_table(
                    table="municipal_districts",
                    columns=self.MUNICIPAL_DISTRICT_COLUMNS,
                    on_conflict_column="municipal_district_id",
                    data=municipal_district_data,
                    session=session,
                )

                logger.info("insert municipal_districts complete")
                logger.info("insert metro")

                await insert_into_table(
                    table="metros",
                    columns=self.METRO_COLUMNS,
                    on_conflict_column="metro_id",
                    data=metro_data,
                    session=session,
                )

                logger.info("insert metro complete")
                logger.info("insert buildings")

                await upsert_with_except_from_temp_table(
                    table="buildings",
                    temp_table="buildings_temp",
                    columns=self.BUILDING_COLUMNS,
                    on_conflict_column="building_id",
                    data=buildings_data,
                    session=session,
                )

                logger.info("insert buildings complete")
                logger.info("insert new_aparts")

                await upsert_with_except_from_temp_table(
                    table="new_aparts",
                    temp_table="new_aparts_temp",
                    columns=self.NEW_APARTS_COLUMNS,
                    on_conflict_column="new_apart_id",
                    data=new_aparts_data,
                    session=session,
                )

                logger.info("insert new_aparts complete")
                return {'status' : 'success'}


    async def get_building_and_aparts(self):
        retry_options = ExponentialRetry(attempts=3)
        async with RetryClient(
            raise_for_status=False, retry_options=retry_options
        ) as retry_client:
            async with retry_client.get(
                url=BASE_URL, params=APART_AND_BUILDINGS_PARAMS
            ) as request:
                if request.status == 200:
                    result: dict = await request.json()
                    buildings = [
                        BuildingSchema.model_validate(building).model_dump()
                        for building in result["objects"]["items"]
                    ]
                    new_aparts = [
                        NewApartSchema.model_validate(building).model_dump()
                        for building in result["housings"]["items"]
                    ]
                    return buildings, new_aparts
                else:
                    logger.error(f"Error {request.status}: {await request.text()}")
                    raise HttpBadRequest()

    async def get_metro_district_municipal_district(self):
        retry_options = ExponentialRetry(attempts=3)
        async with RetryClient(
            raise_for_status=False, retry_options=retry_options
        ) as retry_client:
            async with retry_client.get(url=BASE_URL, params=FILTER_PARAMS) as request:
                if request.status == 200:
                    result = await request.json()
                    districts_response =DistrictAdapter.validate_python(  # noqa
                        result["filters"]["county"]
                    )
                    metro = MetroAdapter.validate_python(result["filters"]["metro"])

                    metro = [
                        MetroSchemaForInsert.model_validate(
                            {"metro_id": metro_id, **value.model_dump()}
                        ).model_dump()
                        for metro_id, value in metro.items()
                    ]
                    districts = [
                        DistrictSchemaForInsert.model_validate(
                            {"district_id": district_id, **value.model_dump()}
                        ).model_dump()
                        for district_id, value in districts_response.items()
                    ]

                    municipal_districts = [
                        MunicipalDistrictSchemaForInsert.model_validate(
                            {"municipal_district_id": municipal_district_id, **value.model_dump()}
                        ).model_dump()
                        for _, district in districts_response.items()
                        for municipal_district_id, value in district.municipal_district.items()
                    ]

                    return metro, districts, municipal_districts
                else:
                    logger.error(f"Error {request.status}: {await request.text()}")
                    raise HttpBadRequest()

    EXPORT_COLUMNS = {
        "new_apart_id": "ID",
        "address": "Адрес",
        "building": "Дом",
        "number": "№",
        "rooms": "Комнат",
        "floor": "Этаж",
        "area": "Площадь, м²",
        "type_label": "Тип",
        "price": "Цена, ₽",
        "price_prev": "Прошлая цена, ₽",
        "price_delta_prev": "Δ к прошлой, ₽",
        "price_delta_prev_pct": "Δ к прошлой, %",
        "price_max": "Максимум, ₽",
        "price_delta_max_pct": "Δ к максимуму, %",
        "has_discount": "Скидка",
        "discount_pct": "Скидка, %",
        "discount_is_new": "Скидка новая",
        "reserve": "В резерве",
        "is_family": "Семейная ипотека",
        "is_favorite": "Избранное",
        "plan_url": "Планировка",
        "tour_3d_url": "3D-тур",
        "mosres_url": "Ссылка",
        "updated_at": "Обновлено",
    }

    async def get_excel_file(
        self, *, favorites_only: bool = False, building_id: int | None = None
    ) -> tuple[str, str]:
        rows = await self.get_aparts_table(
            favorites_only=favorites_only, building_id=building_id
        )
        frame = pd.DataFrame([r.model_dump() for r in rows])
        if not frame.empty:
            frame = frame.reindex(columns=list(self.EXPORT_COLUMNS)).rename(
                columns=self.EXPORT_COLUMNS
            )

        suffix = "-favorites" if favorites_only else ""
        file_name = f"{datetime.date.today():%Y-%m-%d}{suffix}.xlsx"
        file_path = EXCEL_FOLDER.joinpath(file_name)
        frame.to_excel(file_path, index=False)
        return str(file_path), file_name
    
    async def get_buildings_apartments(self, building_id: int):
        async with Session() as session:
            return await get_buildings_apartments(building_id=building_id, session=session)

    async def get_buildings_history(self, building_id: int):
        async with Session() as session:
            return await get_buildings_history(building_id=building_id, session=session)

    async def get_buildings_table(self) -> list[BuildingRow]:
        async with Session() as session:
            rows = await get_buildings_table(session=session)
        return [BuildingRow.model_validate(dict(r)) for r in rows]

    async def get_new_aparts_history(self, new_apart_id: int):
        async with Session() as session:
            return await get_new_aparts_history(new_apart_id=new_apart_id, session=session)

    async def get_aparts_table(
        self,
        *,
        building_id: int | None = None,
        building_ids: str | None = None,
        favorites_only: bool = False,
        discount_only: bool = False,
        price_drop_only: bool = False,
        reserved_only: bool = False,
        family_only: bool = False,
        q: str | None = None,
    ) -> list[ApartRow]:
        async with Session() as session:
            rows = await get_aparts_table(
                building_id=building_id,
                building_ids=building_ids,
                favorites_only=favorites_only,
                discount_only=discount_only,
                price_drop_only=price_drop_only,
                reserved_only=reserved_only,
                family_only=family_only,
                q=q,
                session=session,
            )
        return [ApartRow.model_validate(dict(r)) for r in rows]

    async def refresh_all(self) -> dict:
        ok = True
        try:
            await self.update_all_data()
            async with Session() as session:
                async with session.begin():
                    await refresh_building_price_stats(session=session)
        except Exception:
            ok = False
            raise
        finally:
            async with Session() as session:
                async with session.begin():
                    await record_refresh_run(ok=ok, session=session)
        return {"status": "success"}

    async def get_building_price_dynamics(self, building_id: int):
        async with Session() as session:
            return await get_building_price_dynamics(
                building_id=building_id, session=session
            )

    async def get_dashboard(self, favorites_only: bool = False) -> DashboardMetrics:
        async with Session() as session:
            row = await get_dashboard_metrics(
                favorites_only=favorites_only, session=session
            )
        return DashboardMetrics.model_validate(dict(row))

    async def get_dashboard_timeseries(
        self, favorites_only: bool = False, days: int = 30
    ) -> list[DashboardPoint]:
        days = max(1, min(days, 180))
        async with Session() as session:
            rows = await get_dashboard_timeseries(
                favorites_only=favorites_only, days=days, session=session
            )
        return [DashboardPoint.model_validate(dict(r)) for r in rows]

    async def get_buildings_stats(self) -> list[BuildingStat]:
        async with Session() as session:
            rows = await get_buildings_stats(session=session)
        return [BuildingStat.model_validate(dict(r)) for r in rows]

    async def get_refresh_status(self) -> RefreshStatus:
        async with Session() as session:
            last = await get_last_refresh(session=session)
        return RefreshStatus(
            last_refresh=last,
            interval_minutes=settings.REFRESH_INTERVAL_MINUTES,
        )

    async def add_favorite(self, new_apart_id: int) -> FavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await add_favorite(new_apart_id=new_apart_id, session=session)
        return FavoriteToggleResult(new_apart_id=new_apart_id, is_favorite=True)

    async def remove_favorite(self, new_apart_id: int) -> FavoriteToggleResult:
        async with Session() as session:
            async with session.begin():
                await remove_favorite(new_apart_id=new_apart_id, session=session)
        return FavoriteToggleResult(new_apart_id=new_apart_id, is_favorite=False)

    async def list_favorites(self) -> list[int]:
        async with Session() as session:
            return await list_favorites(session=session)