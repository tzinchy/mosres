-- Шансы живых лотов по просмотрам в день.
-- На завершённых продажах считаем, как часто торги заканчивались продажей и
-- как часто итог выше начальной цены (была борьба), в зависимости от того,
-- сколько просмотров в день собирал лот: внутри типа объекта лоты делятся на
-- пять равных групп (квинтилей) по этому показателю. Живой лот попадает в
-- ту группу, чьей границе соответствует его скорость просмотров.
-- Просмотры нормируются на дни приёма заявок: счётчик копится всю жизнь
-- лота, и «просмотров всего» у свежего и старого лота несопоставимы.
-- Оценка эмпирическая, не модель: без поправки на цену, район и сезон.
WITH fin AS (
    SELECT
        object_type_name                                                  AS t,
        status_text IN ('Признаны состоявшимися', 'Единственный участник')
            AND final_price > 0                                           AS sold,
        final_price > start_price                                         AS competed,
        portal_views::numeric
            / GREATEST(1, EXTRACT(epoch FROM request_end_date - request_start_date) / 86400)
                                                                          AS vpd
    FROM torgi_objects
    WHERE tender_type_code = 'nsi:tender_type_portal:13'
      AND status_text IN (
            'Признаны состоявшимися', 'Признаны несостоявшимися', 'Единственный участник'
          )
      AND start_price > 0
      AND portal_views IS NOT NULL
      AND request_start_date IS NOT NULL
      AND request_end_date > request_start_date
),
bucketed AS (
    SELECT t, sold, competed, vpd,
           ntile(5) OVER (PARTITION BY t ORDER BY vpd)                     AS q
    FROM fin
    WHERE t IN (SELECT t FROM fin GROUP BY t HAVING count(*) >= 200)
),
rates AS MATERIALIZED (
    SELECT t, q,
           count(*)                                                       AS n,
           max(vpd)                                                       AS hi,
           avg(sold::int)                                                 AS p_sold,
           avg(competed::int) FILTER (WHERE sold)                         AS p_competed
    FROM bucketed
    GROUP BY t, q
),
live AS (
    SELECT
        lot_id,
        object_type_name                                                  AS t,
        portal_views::numeric
            / GREATEST(1, EXTRACT(epoch FROM now() - request_start_date) / 86400)
                                                                          AS vpd
    FROM torgi_objects
    WHERE tender_type_code = 'nsi:tender_type_portal:13'
      AND (request_end_date > now() OR tender_date > now())
      AND (status_text IS NULL OR status_text IN ('Прием заявок', 'Прием заявок завершен'))
      AND portal_views IS NOT NULL
      AND request_start_date IS NOT NULL
)
SELECT
    l.lot_id,
    l.t                                                                   AS object_type_name,
    round(l.vpd, 1)                                                       AS views_per_day,
    r.q                                                                   AS bucket,
    round(r.p_sold, 3)                                                    AS p_sold,
    round(r.p_competed, 3)                                                AS p_competed,
    r.n
FROM live l
JOIN LATERAL (
    -- первая группа, чья верхняя граница не меньше скорости лота; если лот
    -- быстрее всех — самая верхняя
    SELECT * FROM rates r
    WHERE r.t = l.t
    ORDER BY GREATEST(l.vpd - r.hi, 0), r.q
    LIMIT 1
) r ON true
