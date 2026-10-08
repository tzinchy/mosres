-- Тонкий массив под карту и scatter: только координаты, цена, площадь и тип.
SELECT
    lot_id,
    object_type_name,
    short_address,
    latitude,
    longitude,
    start_price,
    price_per_square,
    object_area,
    rooms_count,
    portal_views,
    (
        (request_end_date IS NOT NULL AND request_end_date > now())
        OR (tender_date IS NOT NULL AND tender_date > now())
    )                                                                    AS is_live
FROM torgi_objects
WHERE start_price > 0
  AND (
        CAST(:object_type AS text) IS NULL
        OR object_type_name = CAST(:object_type AS text)
      )
ORDER BY lot_id DESC
LIMIT 5000
