-- История версий одного лота недвижимости: что именно портал менял и когда.
SELECT
    h.version,
    h.updated_at,
    h.status_text,
    h.start_price,
    h.final_price,
    h.deposit,
    h.request_end_date,
    h.tender_date,
    lag(h.start_price) OVER w                                       AS start_price_prev,
    lag(h.status_text) OVER w                                       AS status_text_prev
FROM torgi_objects_history h
WHERE h.lot_id = :lot_id
WINDOW w AS (PARTITION BY h.lot_id ORDER BY h.version)
ORDER BY h.version DESC
