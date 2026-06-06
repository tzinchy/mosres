import datetime

from src.config import EXCEL_FOLDER
from loguru import logger
import pandas as pd
from aiohttp_retry import ExponentialRetry, RetryClient
from src.database import Session
from src.schemas import (
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
    get_data_for_excel_file,
    get_buildings_apartments,
    get_new_aparts_history,
    get_new_aparts_table,
    get_buildings_history,
    get_buildings_table
)
from src.utils import read_from_sql_folder
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
        "anons_texts", "family_hypotec", "county",
    ]
    NEW_APARTS_COLUMNS = [
        "new_apart_id", "address", "building", "building_id", "building_code", "number", "rooms", "floor",
        "block", "area", "price", "price_m", "type", "term_of_application", "open_sale", "reserve", "y2_sell", "for_sell", "num_on_floor",
        "property", "advants", "article", "price_with_discount", "percentage_discount",
        "auction", "block_name",
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

    async def get_excel_file(
        self,
    ):
        file_name = f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx"
        file_path = EXCEL_FOLDER.joinpath(file_name)
        await self.update_all_data()
        query = read_from_sql_folder("table_with_versions")
        async with Session() as session:
            pd.DataFrame(
                await get_data_for_excel_file(query=query, session=session)
            ).to_excel(file_path)
        return file_path, file_name
    
    async def get_buildings_apartments(building_id : int):
        async with Session() as session:
            return await get_buildings_apartments(building_id=building_id, session=session)

    async def get_buildings_history(building_id : int): 
        async with Session() as session:
            return await get_buildings_history(building_id=building_id, session=session)
    
    async def get_buildings_table():
        async with Session() as session:
            return await get_buildings_table(session=session)
        
    async def get_new_aparts_history(new_apart_id : int | None = None):
        async with Session() as session:
            return await get_new_aparts_history(new_apart_id=new_apart_id, session=session)
    
    async def get_new_aparts_table(new_apartd_ids : list[int] = None):
        async with Session() as session:
            return await get_new_aparts_history(new_apartd_ids=new_apartd_ids, session=session)