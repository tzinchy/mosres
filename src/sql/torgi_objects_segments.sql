-- Где торги окупаются: сегмент «тип объекта × округ» по завершённым продажам.
-- Берутся только продажи (tender_type_portal:13) с известной площадью и
-- начальной ценой; исход — по статусу портала. Итоговая цена — это цена,
-- которую рынок торгов реально заплатил, а не оценка квартиры на вторичке.
WITH fin AS (
    SELECT
        o.object_type_name || CASE
            WHEN COALESCE(o.short_address ~* '(подвал|цоколь|этаж\s*№?\s*-)', false)
            THEN ' · подвал' ELSE '' END                                  AS object_type_name,
        COALESCE(NULLIF(o.region_name, ''), 'не указан')                  AS region_name,
        o.status_text IN ('Признаны состоявшимися', 'Единственный участник')
            AND o.final_price > 0                                          AS sold,
        o.final_price / o.object_area                                     AS final_ppm,
        o.final_price / o.start_price - 1                                 AS premium,
        o.final_price = o.start_price                                     AS at_start,
        o.portal_views
    FROM torgi_objects o
    WHERE o.tender_type_code = 'nsi:tender_type_portal:13'
      AND o.status_text IN (
            'Признаны состоявшимися', 'Признаны несостоявшимися', 'Единственный участник'
          )
      AND o.start_price > 0
      AND o.object_area > 0
),
live AS (
    SELECT
        object_type_name || CASE
            WHEN COALESCE(short_address ~* '(подвал|цоколь|этаж\s*№?\s*-)', false)
            THEN ' · подвал' ELSE '' END                                  AS object_type_name,
        COALESCE(NULLIF(region_name, ''), 'не указан')                    AS region_name,
        count(*)                                                          AS live_lots
    FROM torgi_objects
    WHERE tender_type_code = 'nsi:tender_type_portal:13'
      AND request_end_date > now()
      AND (status_text IS NULL OR status_text = 'Прием заявок')
    GROUP BY 1, 2
)
SELECT
    f.object_type_name,
    f.region_name,
    count(*)                                                              AS finished,
    count(*) FILTER (WHERE f.sold)                                        AS sold,
    round((count(*) FILTER (WHERE f.sold))::numeric / count(*), 3)         AS sold_share,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.final_ppm)
           FILTER (WHERE f.sold))::numeric)                                AS median_final_ppm,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.premium)
           FILTER (WHERE f.sold))::numeric, 3)                             AS median_premium,
    round((count(*) FILTER (WHERE f.sold AND f.at_start))::numeric
          / NULLIF(count(*) FILTER (WHERE f.sold), 0), 3)                  AS at_start_share,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY f.portal_views))::numeric)
                                                                          AS median_views,
    COALESCE(max(l.live_lots), 0)                                         AS live_lots
FROM fin f
LEFT JOIN live l
       ON l.object_type_name = f.object_type_name AND l.region_name = f.region_name
GROUP BY f.object_type_name, f.region_name
HAVING count(*) FILTER (WHERE f.sold) >= 10
ORDER BY sold DESC
LIMIT 100
