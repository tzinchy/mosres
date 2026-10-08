-- Активность версий: распределение числа версий на лот (day IS NULL) и
-- изменения по дням за 90 дней (versions IS NULL). Сервис режет по day.
SELECT "version" AS versions, NULL::date AS day, count(*) AS lots
FROM torgi_objects
GROUP BY 1
UNION ALL
SELECT NULL::int, updated_at::date, count(*)
FROM torgi_objects_history
WHERE "version" > 1
  AND updated_at >= now() - interval '90 days'
GROUP BY 2
