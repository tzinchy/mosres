# FIRST_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# SECOND_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000
# THIRD_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000&object=95265
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
import aiohttp
import aiofiles
import asyncio
import json
import loguru
from schemas import MetroAdapter, DistrictAdapter, Building, NewApart

BASE_URL = 'https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php'

APART_AND_BUILDINGS_PARAMS = {
    'type[]': ['R'], 
    'pagesize': 1_000_000
}

FILTER_PARAMS = {
    "cmd" : 'filters'
}

async def get_existing_building_and_aparts():
    async with aiohttp.ClientSession() as session:
        async with session.get(url=BASE_URL, params=APART_AND_BUILDINGS_PARAMS) as request:
            if request.status == 200:
                result : dict = await request.json()
                buildings = [Building.model_validate(building) for building in result['objects']['items']]
                new_apart = [NewApart.model_validate(building) for building in result['housings']['items']]
                print(new_apart)
                print(buildings)
                loguru.logger.info("Data saved successfully!")
            else:
                loguru.logger.error(f"Error {request.status}: {await request.text()}")

async def get_existing_filters():
    async with aiohttp.ClientSession() as session:
        async with session.get(url=BASE_URL, params=FILTER_PARAMS) as request:
            if request.status == 200:
                result = await request.json()
                county = DistrictAdapter.validate_python(result['filters']['county'])
                metro = MetroAdapter.validate_python(result['filters']['metro'])
                # async with aiofiles.open("finishing.json", "w") as file: 
                #     await file.write(json.dumps(result['filters']['finishing'], indent=4, ensure_ascii=False)) 
                # async with aiofiles.open('status.json', "w") as file:
                #     await file.write(json.dumps(result['filters']['status'], indent=4, ensure_ascii=False)) 
                # async with aiofiles.open('type.json', "w") as file:
                #     await file.write(json.dumps(result['filters']['type'], indent=4, ensure_ascii=False)) 
                print(county)
                print(metro)
                loguru.logger.info("Data saved successfully!")
            else:
                loguru.logger.error(f"Error {request.status}: {await request.text()}")


async def main():
    await get_existing_building_and_aparts()

if __name__ == '__main__':
    asyncio.run(main())