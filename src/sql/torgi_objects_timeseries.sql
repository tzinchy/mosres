-- По месяцам даты торгов: лотов, сумма итоговых, средний Δ итог/начало,
-- средняя цена за м². Сезонность (по месяцу года) сервис считает из этих строк.
SELECT
    date_trunc('month', tender_date)::date                               AS month,
    count(*)                                                             AS lots,
    round(sum(final_price))                                              AS sum_final_price,
    round(avg(
        CASE WHEN final_price IS NOT NULL AND start_price > 0
             THEN (final_price - start_price) / start_price * 100
        END
    ), 1)                                                                AS avg_delta_pct,
    round(avg(price_per_square) FILTER (WHERE price_per_square > 0))      AS avg_price_per_square
FROM torgi_objects
WHERE tender_date IS NOT NULL
GROUP BY 1
ORDER BY 1;
