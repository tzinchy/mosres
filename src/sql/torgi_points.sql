-- Тонкий массив под scatter, карту и гистограмму регионов номеров: без фото и
-- длинных текстов. Мощность и объём двигателя лежат текстом — берём первое
-- целое число; координаты тоже текстом, поэтому кастуем только числовые.
SELECT
    tl.lot_id,
    tl.name,
    tl.brand,
    tl.model,
    tl.year,
    COALESCE(tl.transport_category, 'Без категории')                      AS category,
    tl.status_text,
    (tl.status_text = 'Прием заявок')                                     AS is_open,
    tl.mileage,
    (regexp_match(tl.power, '(\d+)'))[1]::numeric                         AS power_hp,
    (regexp_match(tl.engine_volume, '(\d+)'))[1]::numeric                 AS engine_volume,
    tl.start_price,
    tl.final_price,
    CASE WHEN tl.final_price IS NOT NULL AND tl.start_price > 0
         THEN round((tl.final_price - tl.start_price) / tl.start_price * 100, 1)
    END                                                                   AS delta_pct,
    tl.portal_views,
    tl.plate_norm,
    tl.plate_region,
    CASE WHEN tl.latitude ~ '^-?\d+(\.\d+)?$'
         THEN tl.latitude::double precision
    END                                                                   AS latitude,
    CASE WHEN tl.longitude ~ '^-?\d+(\.\d+)?$'
         THEN tl.longitude::double precision
    END                                                                   AS longitude
FROM torgi_lots tl
ORDER BY tl.lot_id;
