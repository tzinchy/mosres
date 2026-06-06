import asyncio
import datetime

import pandas as pd
from loguru import logger

from src.client import MosResClient
from src.config import EXCEL_FOLDER
from src.database import Session
from src.repository import (
    get_data_for_excel_file,
    insert_into_table,
    upsert_with_except_from_temp_table,
)
from src.utils import read_from_sql_folder


class MosResService:
    # fmt: off
    BUILDING_COLUMNS = [
        "building_id", "address", "code", "district", "latitude", "longitude",
        "status_code", "finishing_code", "metro", "metro_car", "metro_walk",
        "floors", "flats", "vvod", "anons_texts", "family_hypotec", "county",
    ]
    NEW_APARTS_COLUMNS = [
        "new_apart_id", "address", "building", "building_id", "building_code",
        "number", "rooms", "floor", "block", "area", "price", "price_m", "type",
        "term_of_application", "open_sale", "reserve", "y2_sell", "for_sell",
        "num_on_floor", "property", "advants", "article", "price_with_discount",
        "percentage_discount", "auction", "block_name",
    ]
    MUNICIPAL_DISTRICT_COLUMNS = ["municipal_district_id", "name", "polygons"]
    DISTRICT_COLUMNS = ["district_id", "name", "full_name", "polygons"]
    METRO_COLUMNS = ["metro_id", "name", "color"]
    # fmt: on

    def __init__(self, client: MosResClient | None = None) -> None:
        self._client = client or MosResClient()

    async def update_all_data(self) -> dict:
        (metro_data, district_data, municipal_district_data), (
            buildings_data,
            new_aparts_data,
        ) = await asyncio.gather(
            self._client.fetch_filters(),
            self._client.fetch_buildings_and_aparts(),
        )

        async with Session() as session:
            async with session.begin():
                logger.info("insert districts")
                await insert_into_table(
                    table="districts",
                    columns=self.DISTRICT_COLUMNS,
                    on_conflict_column="district_id",
                    data=district_data,
                    session=session,
                )

                logger.info("insert municipal_districts")
                await insert_into_table(
                    table="municipal_districts",
                    columns=self.MUNICIPAL_DISTRICT_COLUMNS,
                    on_conflict_column="municipal_district_id",
                    data=municipal_district_data,
                    session=session,
                )

                logger.info("insert metro")
                await insert_into_table(
                    table="metros",
                    columns=self.METRO_COLUMNS,
                    on_conflict_column="metro_id",
                    data=metro_data,
                    session=session,
                )

                logger.info("insert buildings")
                await upsert_with_except_from_temp_table(
                    table="buildings",
                    temp_table="buildings_temp",
                    columns=self.BUILDING_COLUMNS,
                    on_conflict_column="building_id",
                    data=buildings_data,
                    session=session,
                )

                logger.info("insert new_aparts")
                await upsert_with_except_from_temp_table(
                    table="new_aparts",
                    temp_table="new_aparts_temp",
                    columns=self.NEW_APARTS_COLUMNS,
                    on_conflict_column="new_apart_id",
                    data=new_aparts_data,
                    session=session,
                )

        logger.info("update_all_data complete")
        return {"status": "success"}

    async def get_excel_file(self) -> tuple[str, str]:
        file_name = f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx"
        file_path = EXCEL_FOLDER.joinpath(file_name)

        await self.update_all_data()

        query = await read_from_sql_folder("table_with_versions")
        async with Session() as session:
            rows = await get_data_for_excel_file(query=query, session=session)

        pd.DataFrame(rows).to_excel(file_path, index=False)
        return file_path, file_name