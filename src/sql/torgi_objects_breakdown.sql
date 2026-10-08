-- Разрез лотов недвижимости по одному измерению (округ, район, тип объекта).
-- Ключ подставляется из словаря BREAKDOWN_DIMS сервиса, не из пользовательского
-- ввода: это интерполяция в SQL.
SELECT
    COALESCE({dimension}, 'не указано')                             AS label,
    count(*)                                                        AS lots,
    count(*) FILTER (
        WHERE (o.request_end_date IS NOT NULL AND o.request_end_date > now())
           OR (o.tender_date IS NOT NULL AND o.tender_date > now())
    )                                                               AS live_lots,
    round(avg(o.start_price) FILTER (WHERE o.start_price > 0))        AS avg_start_price,
    round(avg(o.price_per_square) FILTER (WHERE o.price_per_square > 0))
                                                                    AS avg_price_per_square,
    round(avg(o.object_area) FILTER (WHERE o.object_area > 0), 1)     AS avg_area
FROM torgi_objects o
WHERE (
        CAST(:object_type AS text) IS NULL
        OR o.object_type_name = CAST(:object_type AS text)
      )
GROUP BY 1
ORDER BY lots DESC
LIMIT 20
