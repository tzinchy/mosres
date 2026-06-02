# FIRST_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# SECOND_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000
# THIRD_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000&object=95265
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
import datetime
import pathlib

import aiofiles
import loguru
import pandas as pd
from aiohttp_retry import ExponentialRetry, RetryClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import Session
from src.models import Building, BuildingHistory, District, NewApart, NewApartHistory
from src.schemas import (
    BuildingSchema,
    DistrictAdapter,
    MetroAdapter,
    MetroSchema,
    NewApartSchema,
)

BASE_URL = (
    "https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php"
)

APART_AND_BUILDINGS_PARAMS = {"type[]": ["R"], "pagesize": 1_000_000}

FILTER_PARAMS = {"cmd": "filters", "pagesize": 1_000_000}


# todo(GLOBAL): extract query builder logic from api to placeholder builder
def create_placheholders(columns: list[str]) -> tuple[str, str]:
    return ", ".join(columns), ", ".join([f":{col}" for col in columns])


def create_placheholders_with_excluded(columns: list[str]) -> tuple[str, str, str]:
    insert_columns, values_columns = create_placheholders(columns)
    return (
        insert_columns,
        values_columns,
        ", ".join([f"{column} = EXCLUDED.{column}" for column in columns]),
    )


async def insert_into_buildings(buildings):
    # fmt: off
    buildings_columns = [
        "building_id", "address", "code", "district", "latitude", "longitude", "status_code",
        "finishing_code", "metro", "metro_car", "metro_walk", "floors", "flats", "vvod",
        "unique", "anons_texts", "family_hypotec", "county",
    ]
    # fmt: on
    buildings_insert_columns, buildings_values_columns, biuldings_excluded_columns = (
        create_placheholders_with_excluded(buildings_columns)
    )
    async with Session() as session:
        await session.execute(
            text(f"""
            INSERT INTO buildings_temp (
                {buildings_insert_columns}
            ) VALUES (
                {buildings_values_columns}
            ) ON CONFLICT (building_id) DO NOTHING
            """),
            buildings,
        )
        await session.execute(
            text(f"""
            INSERT INTO buildings (
                {buildings_insert_columns}
            )
            SELECT
                {buildings_insert_columns}
            FROM buildings_temp
            EXCEPT
            SELECT
                {buildings_insert_columns}
            FROM buildings
            ON CONFLICT (building_id) DO UPDATE SET
                {biuldings_excluded_columns},
                updated_at = NOW();
            """)
        )
        await session.execute(text("TRUNCATE buildings_temp"))
        await session.commit()


async def insert_metro(metros: dict[int, MetroSchema]):
    metro_columns = ["metro_id", "name", "color"]
    metro_insert_columns, metro_values_columns = create_placheholders(metro_columns)
    async with Session() as session:
        for key, value in metros.items():
            await session.execute(
                text(
                    f"""insert into metros ({metro_insert_columns})
                    VALUES ({metro_values_columns})
                    ON conflict (metro_id) DO NOTHING """
                ),
                params={"metro_id": int(key), "name": value.name, "color": value.color},
            )
        await session.commit()


async def insert_district_and_municipal_district(districts: dict[int, District]):

    district_columns = ["district_id", "name", "full_name", "polygons"]
    district_insert_columns, district_values_columns = create_placheholders(
        district_columns
    )

    municipal_district_columns = ["municipal_district_id", "name", "polygons"]
    municipal_district_insert_columns, municipal_district_values_columns = (
        create_placheholders(municipal_district_columns)
    )

    async with Session() as session:
        for key, value in districts.items():
            await session.execute(
                text(f"""insert into districts ({district_insert_columns})
                                        VALUES ({district_values_columns})
                                        ON conflict (district_id) DO NOTHING """),
                # todo: Add Pydantic
                params={
                    "district_id": int(key),
                    "name": value["name"],
                    "full_name": value["full_name"],
                    "polygons": value["polygons"],
                },
            )
            for key, value in value["district"].items():
                await session.execute(
                    text(f"""insert into municipal_districts ({municipal_district_insert_columns})
                                            VALUES ({municipal_district_values_columns})
                                            ON conflict (municipal_district_id) DO NOTHING """),
                    params={
                        "municipal_district_id": int(key),
                        "name": value["name"],
                        "polygons": value["polygons"],
                    },
                )
        await session.commit()


async def insert_into_new_apart(new_aparts):
    # fmt: off
    new_apart_columns = [
        "new_apart_id", "address", "building", "building_id", "building_code", "number", "rooms", "floor",
        "block", "area", "price", "price_m", "type", "term_of_application", "open_sale", "reserve", "y2_sell", "for_sell", "num_on_floor",
        "property", "advants", "article", "price_with_discount", "percentage_discount",
        "auction", "block_name",
    ]
    # fmt: on
    new_apart_insert_columns, new_apart_values_columns, new_apart_excluded_columns = (
        create_placheholders_with_excluded(new_apart_columns)
    )
    async with Session() as session:
        await session.execute(
            text(f"""
            INSERT INTO new_aparts_temp (
                {new_apart_insert_columns}
            ) VALUES (
                {new_apart_values_columns}
            ) ON CONFLICT (new_apart_id) DO NOTHING
        """),
            new_aparts,
        )
        await session.execute(
            text(f"""
            INSERT INTO new_aparts (
                {new_apart_insert_columns}
            )
            SELECT
                {new_apart_insert_columns}
            FROM new_aparts_temp
            EXCEPT
            SELECT
                {new_apart_insert_columns}
            FROM new_aparts
            ON CONFLICT (new_apart_id) DO UPDATE SET
                {new_apart_excluded_columns},
                updated_at = NOW()
            """)
        )
        await session.execute(text("truncate new_aparts_temp"))
        await session.commit()


async def get_existing_building_and_aparts():
    retry_options = ExponentialRetry(attempts=3)
    retry_client = RetryClient(raise_for_status=False, retry_options=retry_options)
    async with retry_client.get(
        url=BASE_URL, params=APART_AND_BUILDINGS_PARAMS
    ) as request:
        if request.status == 200:
            result: dict = await request.json()
            buildings = [
                BuildingSchema.model_validate(building).model_dump()
                for building in result["objects"]["items"]
            ]
            new_apart = [
                NewApartSchema.model_validate(building).model_dump()
                for building in result["housings"]["items"]
            ]
            await insert_into_new_apart(new_aparts=new_apart)
            await insert_into_buildings(buildings=buildings)

        else:
            loguru.logger.error(f"Error {request.status}: {await request.text()}")


async def get_existing_filters():
    retry_options = ExponentialRetry(attempts=3)
    async with retry_client = RetryClient(raise_for_status=False, retry_options=retry_options)
    async with retry_client.get(url=BASE_URL, params=FILTER_PARAMS) as request:
        if request.status == 200:
            result = await request.json()
            county = DistrictAdapter.validate_python(  # noqa
                result["filters"]["county"]
            )
            metro = MetroAdapter.validate_python(
                result["filters"]["metro"]
            )  # ruff ignore
            await insert_metro(metros=metro)
            await insert_district_and_municipal_district(result["filters"]["county"])
        else:
            loguru.logger.error(f"Error {request.status}: {await request.text()}")


async def update_all_data_and_get_new_file():
    main_folder = pathlib.Path("src")
    async with aiofiles.open(
        main_folder.joinpath("sql", "table_with_versions.sql")
    ) as f:
        SQL = await f.read()
    excel_folder = main_folder.joinpath("excel")
    excel_folder.mkdir(parents=True, exist_ok=True)
    file_path = excel_folder.joinpath(
        f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx"
    )
    if file_path.exists():
        return (
            f"{excel_folder.joinpath(datetime.date.today().strftime('%Y-%m-%d'))}.xlsx",
            f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx",
        )
    await get_existing_filters()
    await get_existing_building_and_aparts()
    async with Session() as session:
        result = await session.execute(text(SQL))
        df = pd.DataFrame(result.mappings().all())
        df.to_excel(file_path)
        return (
            f"{excel_folder.joinpath(datetime.date.today().strftime('%Y-%m-%d'))}.xlsx",
            f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx",
        )


async def get_new_aparts_table(session: AsyncSession) -> pd.DataFrame:
    result = await session.execute(select(NewApart))
    return result.mappings().all()


async def get_new_buildings_table(session: AsyncSession) -> pd.DataFrame:
    result = await session.execute(select(Building))
    return result.mappings().all()


async def get_new_aparts_history(new_apart_id, session: AsyncSession) -> pd.DataFrame:
    result = await session.execute(
        select(NewApartHistory).where(NewApartHistory.new_apart_id == new_apart_id)
    )
    return result.mappings().all()


async def get_new_buildings_history(
    new_building_id, session: AsyncSession
) -> pd.DataFrame:
    result = await session.execute(
        select(BuildingHistory).where(
            BuildingHistory.new_building_id == new_building_id
        )
    )
    return result.mappings().all()
