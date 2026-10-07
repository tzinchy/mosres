-- Сводка по категориям транспорта: сколько лотов всего/в приёме заявок и цены.
SELECT
    COALESCE(transport_category, 'Без категории')                        AS category,
    count(*)                                                             AS lots,
    count(*) FILTER (WHERE status_text = 'Прием заявок')                 AS open_lots,
    count(*) FILTER (WHERE final_price IS NOT NULL)                      AS sold_lots,
    round(avg(start_price))                                              AS avg_start_price,
    min(start_price)                                                     AS min_start_price,
    round(avg(final_price))                                              AS avg_final_price,
    round(avg(mileage))                                                  AS avg_mileage,
    count(*) FILTER (WHERE COALESCE(plate, '') <> '')                    AS with_plate
FROM torgi_lots
GROUP BY 1
ORDER BY lots DESC;
