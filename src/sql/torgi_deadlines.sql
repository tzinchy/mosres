-- Ближайшие окончания приёма заявок.
SELECT
    lot_id,
    name,
    status_text,
    request_end_date,
    (request_end_date::date - CURRENT_DATE)                              AS days_left,
    start_price
FROM torgi_lots
WHERE request_end_date IS NOT NULL
  AND request_end_date >= now()
ORDER BY request_end_date
LIMIT 20;
