-- Гибкая разбивка лотов по одному измерению. {key} подставляется из белого
-- списка в сервисе (TorgiService.PIVOT_DIMS), НИКОГДА из пользовательского ввода.
-- Мощность в БД текстом («122,00 л.с.») — берём первое целое число.
SELECT
    {key}                                                                AS key,
    count(*)                                                             AS lots,
    count(*) FILTER (WHERE tl.status_text = 'Прием заявок')               AS open_lots,
    count(*) FILTER (WHERE tl.final_price IS NOT NULL)                    AS sold_lots,
    round(avg(tl.start_price))                                           AS avg_start,
    round(
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY tl.start_price))::numeric
    )                                                                    AS median_start,
    round(avg(tl.final_price))                                           AS avg_final,
    round(avg(
        CASE WHEN tl.final_price IS NOT NULL AND tl.start_price > 0
             THEN (tl.final_price - tl.start_price) / tl.start_price * 100
        END
    ), 1)                                                                AS avg_delta_pct,
    round(avg(tl.mileage))                                               AS avg_mileage,
    round(avg((regexp_match(tl.power, '(\d+)'))[1]::numeric))             AS avg_power,
    round(avg(
        tl.start_price / NULLIF((regexp_match(tl.power, '(\d+)'))[1]::numeric, 0)
    ))                                                                   AS rub_per_hp
FROM torgi_lots tl
GROUP BY 1
ORDER BY lots DESC, 1
LIMIT 60;
