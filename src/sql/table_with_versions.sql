select
    new_apart_id, d."name" as distric,
    md."name" as municipal_district,
    new_aparts_history.address,
    building,
    number,
    rooms,
    floor,
    block,
    area,
    price,
    price_m,
    case new_aparts_history."type"
        when 'R' then 'Жилая'
        when 'NR' then 'Коммерческие помещения'
        when 'P' then 'Паркинг'
        else 'Неизвестный тип'
    end,
    term_of_application,
    open_sale,
    reserve,
    y2_sell,
    for_sell,
    new_aparts_history.num_on_floor,
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
    CONCAT(
        'https://xn--80aae5aibotfo5h.xn--p1ai/obekty/',
        new_aparts_history.building_code,
        '/?flat_id=',
        new_aparts_history.new_apart_id
    ),
    new_aparts_history.created_at,
    new_aparts_history.updated_at,
    anons_texts,
    case b.status_code
        when 'PROCESSING' then 'В процессе'
        when 'FINISHED' then 'Завершено'
        else
            'Неизвестный тип'
    end as building_status,
    new_aparts_history."version"
from new_aparts_history
join buildings b on (new_aparts_history.building_id)::integer = b.building_id
join municipal_districts md on (md.municipal_district_id)::integer = b.district
join districts d on (d.district_id)::integer = b.county
