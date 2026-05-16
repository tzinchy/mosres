from src.service import get_existing_filters
import asyncio

async def main():
    await get_existing_filters()

if __name__ == '__main__':
    asyncio.run(main())