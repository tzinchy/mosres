-- Ряды просмотров по дням сразу для набора лотов (спарклайны в таблице).
SELECT lot_id, day, views
FROM torgi_object_views
WHERE lot_id = ANY(:ids)
ORDER BY lot_id, day
