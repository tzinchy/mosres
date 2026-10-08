-- Где торги по транспорту окупаются: сегмент «категория × возраст» по
-- завершённым торгам. Возраст — по году выпуска. Итоговая цена — цена,
-- которую торги реально дали, а не рыночная цена перепродажи.
-- Колонки те же, что у сегментов недвижимости (torgi_objects_segments.sql):
-- «тип» — категория транспорта, «округ» — возрастная группа, «цена за м²» —
-- итоговая цена лота.
WITH base AS (
    SELECT
        COALESCE(transport_category, 'не указана')                        AS cat,
        CASE
            WHEN year IS NULL    THEN 'год не указан'
            WHEN year < 2010     THEN 'до 2010'
            WHEN year < 2015     THEN '2010–2014'
            WHEN year < 2020     THEN '2015–2019'
            ELSE '2020 и новее'
        END                                                               AS age,
        status_text,
        start_price,
        final_price,
        portal_views
    FROM torgi_lots
    WHERE start_price > 0
),
fin AS (
    SELECT
        cat, age,
        status_text IN ('Признаны состоявшимися', 'Единственный участник')
            AND final_price > 0                                           AS sold,
        final_price                                                       AS final_price,
        final_price / start_price - 1                                     AS premium,
        final_price = start_price                                         AS at_start,
        portal_views
    FROM base
    WHERE status_text IN (
        'Признаны состоявшимися', 'Признаны несостоявшимися', 'Единственный участник'
    )
),
live AS (
    SELECT cat, age, count(*) AS live_lots
    FROM base
    WHERE status_text IS NULL OR status_text = 'Прием заявок'
    GROUP BY 1, 2
)
SELECT
    f.cat                                                                 AS object_type_name,
    f.age                                                                 AS region_name,
    count(*)                                                              AS finished,
    count(*) FILTER (WHERE f.sold)                                        AS sold,
    round((count(*) FILTER (WHERE f.sold))::numeric / count(*), 3)         AS sold_share,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.final_price)
           FILTER (WHERE f.sold))::numeric)                                AS median_final_ppm,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.premium)
           FILTER (WHERE f.sold))::numeric, 3)                             AS median_premium,
    round((count(*) FILTER (WHERE f.sold AND f.at_start))::numeric
          / NULLIF(count(*) FILTER (WHERE f.sold), 0), 3)                  AS at_start_share,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.portal_views))::numeric)
                                                                          AS median_views,
    COALESCE(max(l.live_lots), 0)                                         AS live_lots
FROM fin f
LEFT JOIN live l ON l.cat = f.cat AND l.age = f.age
GROUP BY f.cat, f.age
HAVING count(*) FILTER (WHERE f.sold) >= 8
ORDER BY sold DESC
LIMIT 100
