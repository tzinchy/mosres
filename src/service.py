# FIRST_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# SECOND_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000
# THIRD_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000&object=95265
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
import aiohttp
import loguru
from src.schemas import (
    MetroAdapter,
    DistrictAdapter,
    Building,
    NewApart,
    Metro,
)
from src.database import Session
from sqlalchemy import text

BASE_URL = (
    "https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php"
)


APART_AND_BUILDINGS_PARAMS = {"type[]": ["R"], "pagesize": 1_000_000}

FILTER_PARAMS = {"cmd": "filters", "pagesize": 1_000_000}


async def insert_into_buildings(buildings):
    async with Session() as session:
        await session.execute(
            text("""
            INSERT INTO buildings_temp (
                building_id, address, code, district, latitude, longitude,
                status_code, finishing_code, metro, metro_car,
                metro_walk, floors, flats, vvod, "unique", anons_texts,
                family_hypotec, county
            ) VALUES (
                :building_id, :address, :code, :district, :latitude, :longitude,
                :status_code, :finishing_code, :metro, :metro_car,
                :metro_walk, :floors, :flats, :vvod, :unique, :anons_texts,
                :family_hypotec, :county
            ) ON CONFLICT (building_id) DO NOTHING
        """),
            buildings,
        )
        await session.execute(
            text("""
            insert into new_aprats (building_id) 
                """)
        )
        await session.commit()


async def insert_metro(metros: dict[int, Metro]):
    async with Session() as session:
        for key, value in metros.items():
            await session.execute(
                text(
                    "insert into metros (metro_id, name, color) VALUES (:metro_id, :name, :color) ON conflict (metro_id) DO NOTHING "
                ),
                params={"metro_id": int(key), "name": value.name, "color": value.color},
            )
        await session.commit()


async def insert_district_and_municipal_district(districts: dict[int, Metro]):
    async with Session() as session:
        for key, value in districts.items():
            await session.execute(
                text("""insert into districts (district_id, name, full_name, polygons)
                                        VALUES (:district_id, :name, :full_name, :polygons)
                                        ON conflict (district_id) DO NOTHING """),
                params={
                    "district_id": int(key),
                    "name": value["name"],
                    "full_name": value["full_name"],
                    "polygons": value["polygons"],
                },
            )
            for key, value in value["district"].items():
                await session.execute(
                    text("""insert into municipal_districts (municipal_district_id, name, polygons)
                                            VALUES (:municipal_district_id, :name, :polygons)
                                            ON conflict (municipal_district_id) DO NOTHING """),
                    params={
                        "municipal_district_id": int(key),
                        "name": value["name"],
                        "polygons": value["polygons"],
                    },
                )
        await session.commit()


async def insert_into_new_apart(new_aparts):
    async with Session() as session:
        await session.execute(
            text("""
            INSERT INTO new_aparts_temp (
                new_apart_id, address, building, building_id, building_code,
                number, rooms, floor, block, area, price, price_m, type, term_of_application, open_sale, reserve, y2_sell,
                for_sell, num_on_floor, property, advants, article,
                price_with_discount, percentage_discount, auction, block_name
            ) VALUES (
                :new_apart_id, :address, :building, :building_id, :building_code,
                :number, :rooms, :floor, :block, :area, :price, :price_m, :type, :term_of_application, :open_sale, :reserve, :y2_sell,
                :for_sell, :num_on_floor, :property, :advants, :article,
                :price_with_discount, :percentage_discount, :auction, :block_name
            ) ON CONFLICT (new_apart_id) DO NOTHING
        """),
            new_aparts,
        )
        await session.execute(
            text('''
            insert into new_aparts (
                new_apart_id, address, building,
                building_id, building_code, "number",
                rooms, "floor", block, area,
                price, price_m, "type",
                term_of_application, open_sale, reserve,
                y2_sell, for_sell, num_on_floor,
                property, advants, article, 
                price_with_discount, percentage_discount, 
                auction, block_name 
            )
            select new_apart_id, address, building,
                building_id, building_code, "number",
                rooms, "floor", block, area,
                price, price_m, "type",
                term_of_application, open_sale, reserve,
                y2_sell, for_sell, num_on_floor,
                property, advants, article, 
                price_with_discount, percentage_discount, 
                auction, block_name from new_aparts_temp
            except 
            select new_apart_id, address, building,
                building_id, building_code, "number",
                rooms, "floor", block, area,
                price, price_m, "type",
                term_of_application, open_sale, reserve,
                y2_sell, for_sell, num_on_floor,
                property, advants, article, 
                price_with_discount, percentage_discount, 
                auction, block_name from new_aparts
            ON conflict (new_apart_id) DO UPDATE SET
                updated_at = NOW(),
                version = COALESCE(EXCLUDED.version, 0) + 1
            ''')
        )
        await session.commit()


async def get_existing_building_and_aparts():
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url=BASE_URL, params=APART_AND_BUILDINGS_PARAMS
        ) as request:
            if request.status == 200:
                result: dict = await request.json()
                buildings = [
                    Building.model_validate(building).model_dump()
                    for building in result["objects"]["items"]
                ]
                new_apart = [
                    NewApart.model_validate(building).model_dump()
                    for building in result["housings"]["items"]
                ]
                await insert_into_new_apart(new_aparts=new_apart)
                await insert_into_buildings(buildings=buildings)

            else:
                loguru.logger.error(f"Error {request.status}: {await request.text()}")


async def get_existing_filters():
    async with aiohttp.ClientSession() as session:
        async with session.get(url=BASE_URL, params=FILTER_PARAMS) as request:
            if request.status == 200:
                result = await request.json()
                county = DistrictAdapter.validate_python(result["filters"]["county"])
                metro = MetroAdapter.validate_python(result["filters"]["metro"])
                await insert_metro(metros=metro)
                await insert_district_and_municipal_district(
                    result["filters"]["county"]
                )
            else:
                loguru.logger.error(f"Error {request.status}: {await request.text()}")
