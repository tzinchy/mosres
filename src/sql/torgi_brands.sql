-- Топ-15 марок: лотов, средняя начальная, средний Δ итог/начало.
SELECT
    COALESCE(brand, 'Без марки')                                         AS brand,
    count(*)                                                             AS lots,
    round(avg(start_price))                                              AS avg_start_price,
    round(avg(
        CASE WHEN final_price IS NOT NULL AND start_price > 0
             THEN (final_price - start_price) / start_price * 100
        END
    ), 1)                                                                AS avg_delta_pct
FROM torgi_lots
GROUP BY 1
ORDER BY lots DESC, brand
LIMIT 15;
