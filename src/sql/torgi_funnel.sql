-- Воронка статусов. Этапы не взаимоисключающие: это срез «сколько лотов дошло
-- до стадии», а не разбивка по текущему статусу.
SELECT stage_order, status, lots
FROM (VALUES
    (1, 'Приём заявок',
        (SELECT count(*) FROM torgi_lots WHERE status_text = 'Прием заявок')),
    (2, 'Торги назначены',
        (SELECT count(*) FROM torgi_lots WHERE tender_date IS NOT NULL)),
    (3, 'Завершены',
        (SELECT count(*) FROM torgi_lots
          WHERE COALESCE(status_text, '') NOT IN ('', 'Прием заявок'))),
    (4, 'Продано',
        (SELECT count(*) FROM torgi_lots WHERE final_price IS NOT NULL))
) AS f(stage_order, status, lots)
ORDER BY stage_order;
