-- Сводка по лотам недвижимости: по одному разрезу на тип объекта.
-- «Живой» лот — приём заявок ещё идёт или торги впереди (status_text для этого
-- не годится: он приходит из карточки, а карточки архива читаются порциями).
SELECT
    COALESCE(o.object_type_name, 'Без типа')                        AS object_type_name,
    count(*)                                                        AS lots,
    count(*) FILTER (
        WHERE (o.request_end_date IS NOT NULL AND o.request_end_date > now())
           OR (o.tender_date IS NOT NULL AND o.tender_date > now())
    )                                                               AS live_lots,
    count(*) FILTER (WHERE o.final_price IS NOT NULL)               AS sold_lots,
    round(avg(o.start_price) FILTER (WHERE o.start_price > 0))       AS avg_start_price,
    round(sum(o.start_price) FILTER (WHERE o.start_price > 0))       AS sum_start_price,
    round(avg(o.price_per_square) FILTER (WHERE o.price_per_square > 0))
                                                                    AS avg_price_per_square,
    round(avg(o.object_area) FILTER (WHERE o.object_area > 0), 1)    AS avg_area,
    count(*) FILTER (WHERE fav.lot_id IS NOT NULL)                  AS favorites,
    sum(o.portal_views)                                             AS sum_views,
    round(avg(o.portal_views) FILTER (WHERE o.portal_views > 0))     AS avg_views
FROM torgi_objects o
LEFT JOIN torgi_object_favorites fav
    ON fav.lot_id = o.lot_id AND fav.user_id = :user_id
GROUP BY 1
ORDER BY lots DESC
