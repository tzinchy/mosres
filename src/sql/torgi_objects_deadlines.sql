-- Ближайшие окончания приёма заявок.
SELECT
    lot_id,
    name,
    object_type_name,
    short_address,
    status_text,
    request_end_date,
    (request_end_date::date - CURRENT_DATE)                              AS days_left,
    start_price,
    object_area
FROM torgi_objects
WHERE request_end_date IS NOT NULL
  AND request_end_date >= now()
ORDER BY request_end_date
LIMIT 20;
