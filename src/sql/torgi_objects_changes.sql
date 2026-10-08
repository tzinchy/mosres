-- Последние изменения лотов из истории версий: цена, статус, итоговая.
WITH h AS (
    SELECT
        lot_id,
        "version",
        updated_at,
        name,
        object_type_name,
        status_text,
        start_price,
        final_price,
        lag(start_price) OVER w  AS prev_start_price,
        lag(status_text) OVER w  AS prev_status_text,
        lag(final_price) OVER w  AS prev_final_price
    FROM torgi_objects_history
    WINDOW w AS (PARTITION BY lot_id ORDER BY "version")
)
SELECT
    lot_id,
    name,
    object_type_name,
    "version",
    updated_at,
    status_text,
    prev_status_text,
    start_price,
    prev_start_price,
    final_price,
    round(
        (start_price - prev_start_price) / NULLIF(prev_start_price, 0) * 100, 1
    )                                                                    AS delta_pct,
    (prev_start_price IS NOT NULL AND start_price < prev_start_price)     AS price_down,
    (prev_start_price IS NOT NULL AND start_price > prev_start_price)     AS price_up,
    (status_text IS DISTINCT FROM prev_status_text)                       AS status_changed,
    (final_price IS NOT NULL AND prev_final_price IS NULL)                AS sold
FROM h
WHERE "version" > 1
  AND (
        start_price IS DISTINCT FROM prev_start_price
        OR status_text IS DISTINCT FROM prev_status_text
        OR (final_price IS NOT NULL AND prev_final_price IS NULL)
      )
ORDER BY updated_at DESC, "version" DESC
LIMIT 50;
