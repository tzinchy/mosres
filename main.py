import pandas as pd
from src.database import Session
from sqlalchemy import text
import datetime

import asyncio

SQL = '''
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
CONCAT('https://xn--80aae5aibotfo5h.xn--p1ai/obekty/', new_aparts.building_code, '/?flat_id=', new_aparts.new_apart_id)
	from new_aparts 
join buildings b on (new_aparts.building_id)::integer = b.building_id
join municipal_districts md on (md.municipal_district_id)::integer = b.district
join districts d on (d.district_id)::integer = b.county 
'''
async def get_data():
    async with Session() as session:
        result = await session.execute(text(SQL))
        df = pd.DataFrame(result.mappings().all())
        df.to_excel(f'{datetime.date.today().strftime("%Y-%m-%d")}.xlsx')
    
if __name__ == '__main__':
    asyncio.run(get_data())