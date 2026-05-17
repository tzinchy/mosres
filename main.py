from src.service import get_existing_building_and_aparts, get_existing_filters
import asyncio

async def main():
    await get_existing_filters() 
    await get_existing_building_and_aparts()

if __name__ == '__main__':
    asyncio.run(main())