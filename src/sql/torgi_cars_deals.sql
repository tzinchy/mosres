-- Живые лоты транспорта, у которых начальная цена ниже того, за что уходили
-- похожие: той же марки и возрастной группы (если там набралось хотя бы 5
-- продаж), иначе той же категории и возрастной группы (хотя бы 8). Ожидаемая
-- наценка — медиана наценки итога над начальной ценой в том же сегменте.
-- Формат строк тот же, что у лотов недвижимости (torgi_objects_deals.sql):
-- «цена за м²» здесь — просто цена лота, bench_level house = марка,
-- region = категория. Скидка к итогам торгов — не прибыль перепродажи.
WITH base AS (
    SELECT
        lot_id,
        COALESCE(transport_category, 'не указана')                        AS cat,
        CASE
            WHEN year IS NULL    THEN 'год не указан'
            WHEN year < 2010     THEN 'до 2010'
            WHEN year < 2015     THEN '2010–2014'
            WHEN year < 2020     THEN '2015–2019'
            ELSE '2020 и новее'
        END                                                               AS age,
        -- одна марка пишется по-разному: «Форд», «FORD ФОРД», «Ford»
        CASE lower(split_part(COALESCE(brand, ''), ' ', 1))
            WHEN 'форд' THEN 'ford'
            WHEN 'тойота' THEN 'toyota'
            WHEN 'фольксваген' THEN 'volkswagen'
            WHEN 'ниссан' THEN 'nissan'
            WHEN 'рено' THEN 'renault'
            WHEN 'бмв' THEN 'bmw'
            WHEN 'ауди' THEN 'audi'
            WHEN 'mercedes' THEN 'mercedes-benz'
            WHEN 'mersedes-benz' THEN 'mercedes-benz'
            WHEN '' THEN NULL
            ELSE lower(split_part(brand, ' ', 1))
        END                                                               AS brand_key,
        brand, model, year, mileage, plate_norm, status_text, start_price, final_price,
        request_end_date, tender_date, portal_views
    FROM torgi_lots
    WHERE start_price > 0
),
fin AS (
    SELECT cat, age, brand_key,
           final_price                                                    AS price,
           final_price / start_price - 1                                  AS premium
    FROM base
    WHERE status_text IN ('Признаны состоявшимися', 'Единственный участник')
      AND final_price > 0
),
by_brand AS (
    SELECT cat, age, brand_key, count(*) AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY price)   AS price,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY premium) AS premium
    FROM fin WHERE brand_key IS NOT NULL
    GROUP BY 1, 2, 3 HAVING count(*) >= 5
),
by_cat AS (
    SELECT cat, age, count(*) AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY price)   AS price,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY premium) AS premium
    FROM fin GROUP BY 1, 2 HAVING count(*) >= 8
),
deals AS (
    SELECT
        l.lot_id,
        l.cat,
        concat_ws(' ', l.brand, l.model, l.year::text)
            || COALESCE(' · ' || l.plate_norm, '')                       AS title,
        l.age,
        l.mileage,
        l.start_price,
        COALESCE(b.price, c.price)                                        AS bench_price,
        CASE WHEN b.price IS NOT NULL THEN 'house' ELSE 'region' END       AS bench_level,
        COALESCE(b.n, c.n)                                                AS bench_n,
        GREATEST(COALESCE(b.premium, c.premium), 0)                       AS exp_premium,
        l.request_end_date, l.tender_date, l.portal_views
    FROM base l
    LEFT JOIN by_brand b ON b.cat = l.cat AND b.age = l.age AND b.brand_key = l.brand_key
    LEFT JOIN by_cat c ON c.cat = l.cat AND c.age = l.age
    WHERE l.request_end_date > now()
      AND (l.status_text IS NULL OR l.status_text = 'Прием заявок')
)
SELECT * FROM (
    SELECT
        lot_id,
        cat                                                               AS object_type_name,
        title                                                             AS short_address,
        age                                                               AS region_name,
        NULL::text                                                        AS district_name,
        NULL::numeric                                                     AS object_area,
        start_price,
        round(start_price)                                                AS start_ppm,
        round(bench_price::numeric)                                       AS bench_ppm,
        bench_level, bench_n,
        round((1 - start_price / bench_price)::numeric, 3)                AS discount,
        round(start_price * (1 + exp_premium))                            AS est_final_price,
        NULL::numeric                                                     AS deposit,
        request_end_date, tender_date, portal_views,
        row_number() OVER (
            PARTITION BY cat, bench_level ORDER BY start_price / bench_price
        )                                                                 AS rank
    FROM deals
    WHERE bench_price IS NOT NULL
      AND start_price < bench_price * 0.95
      AND start_price > bench_price * 0.1
) ranked
WHERE rank <= 25
ORDER BY discount DESC
