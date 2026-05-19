import pandas as pd
from src.database import Session
from sqlalchemy import text
import datetime
import asyncio
from src.service import get_existing_filters, get_existing_building_and_aparts

SQL = """
select new_apart_id, d."name" as distric,
md."name" as municipal_district,
new_aparts.address, 
building, 
number, 
rooms,
floor,
block,
area,
price,
price_m, 
CASE new_aparts."type"
    WHEN 'R'  THEN 'Жилая'
    WHEN 'NR' THEN 'Коммерческие помещения'
    WHEN 'P'  THEN 'Паркинг'
    ELSE 'Неизвестный тип'
end, 
term_of_application, 
open_sale, 
reserve, 
y2_sell, 
for_sell, 
new_aparts.num_on_floor, 
property, 
article, 
price_with_discount, 
percentage_discount,
auction, 
block_name, 
case b.finishing_code
	when 'STD' then 'Отделка по стандарту реновации'
	when 'NO' then 'Без отделки'
	when 'FULL' then 'С отделкой'
else
	'Неизвестный тип'
end as status_code, 
floors,
flats, 
vvod,
"unique",
CONCAT('https://xn--80aae5aibotfo5h.xn--p1ai/obekty/', new_aparts.building_code, '/?flat_id=', new_aparts.new_apart_id),
new_aparts.created_at, 
new_aparts.updated_at,
anons_texts,
case b.status_code
    WHEN 'PROCESSING' then 'В процессе'
    WHEN 'FINISHED' then 'Завершено'
else
	'Неизвестный тип'
end as building_status,
new_aparts."version"
	from new_aparts 
join buildings b on (new_aparts.building_id)::integer = b.building_id
join municipal_districts md on (md.municipal_district_id)::integer = b.district
join districts d on (d.district_id)::integer = b.county 
"""


async def get_data():
    await get_existing_filters() 
    await get_existing_building_and_aparts()
    async with Session() as session:
         result = await session.execute(text(SQL))
         df = pd.DataFrame(result.mappings().all())
         df.to_excel(f"{datetime.date.today().strftime('%Y-%m-%d')}.xlsx")


if __name__ == "__main__":
    asyncio.run(get_data())
