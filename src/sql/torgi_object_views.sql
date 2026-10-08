-- Просмотры карточки по дням: последнее значение за день, копится с момента
-- появления таблицы (см. триггер torgi_objects).
SELECT day, views
FROM torgi_object_views
WHERE lot_id = :lot_id
ORDER BY day
