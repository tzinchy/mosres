# FIRST_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# SECOND_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000
# THIRD_DATA = https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
# https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?type[]=R&open_sale=1&map=forall&pagesize=100000&object=95265
#https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php?cmd=filters&open_sale=1
import aiohttp
import aiofiles
import asyncio
import json
import loguru

BASE_URL = 'https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php'

async def get_existing_building_and_aparts():
    async with aiohttp.ClientSession() as session:

        params = {
            'type[]': ['R',], #  "R": "Квартиры", "NR": "Коммерческие помещения", "P": "Паркинг"
            'open_sale': '1', #hz
            'map': 'forall', #hz
            'pagesize': 1_000_000, #кол-во записей,
        }
        """
        "finishing" : {
            "FULL" : "С отделкой",
            "NO" : "Без отделки",
            "STD": "Отделка по стандарту реновации"
        }"""
        """
        "metro" : name, color
        
        """

        async with session.get(BASE_URL, params=params) as request:
            if request.status == 200:
                result = await request.json()

                async with aiofiles.open('objectItems.json', 'w') as file:
                    await file.write(json.dumps(result.get('objects', {}), indent=2, ensure_ascii=False)) #1914
                
                async with aiofiles.open('flats.json', 'w') as file:
                    await file.write(json.dumps(result.get('housings', {}), indent=2, ensure_ascii=False)) #62034
                
                loguru.logger.info("Data saved successfully!")
            else:
                loguru.logger.error(f"Error {request.status}: {await request.text()}")

async def main():
    await get_existing_building_and_aparts()

if __name__ == '__main__':
    asyncio.run(main())