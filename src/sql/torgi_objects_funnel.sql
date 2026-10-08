-- Воронка по стадиям. Этапы не взаимоисключающие: это срез «сколько лотов
-- дошло до стадии», а не разбивка по текущему статусу.
SELECT stage_order, status, lots
FROM (VALUES
    (1, 'Приём заявок идёт',
        (SELECT count(*) FROM torgi_objects
          WHERE request_end_date IS NOT NULL AND request_end_date > now())),
    (2, 'Торги назначены',
        (SELECT count(*) FROM torgi_objects WHERE tender_date IS NOT NULL)),
    (3, 'Торги прошли',
        (SELECT count(*) FROM torgi_objects
          WHERE tender_date IS NOT NULL AND tender_date <= now())),
    (4, 'Продано',
        (SELECT count(*) FROM torgi_objects WHERE final_price IS NOT NULL))
) AS f(stage_order, status, lots)
ORDER BY stage_order;
