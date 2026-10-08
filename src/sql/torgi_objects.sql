-- Таблица лотов недвижимости torgi.mos.ru.
--
-- prev — предыдущая версия лота из истории: по ней считается изменение
-- начальной цены, как и в торгах транспорта. «Живой» лот определяется по
-- датам приёма заявок и торгов, а не по status_text: статус приходит только из
-- карточки, а карточка у архивных лотов читается не сразу.
WITH hp AS (
    SELECT lot_id, version, start_price
    FROM torgi_objects_history
)
SELECT
    o.lot_id,
    o.object_type_name,
    o.name,
    o.url,
    o.address,
    o.short_address,
    o.region_name,
    o.district_name,
    o.object_area,
    o.living_area,
    o.kitchen_area,
    o.rooms_count,
    o.room_floor,
    o.floors,
    o.build_year,
    o.house_type,
    o.purpose,
    o.cadastral_number,
    o.start_price,
    o.price_per_square,
    o.deposit,
    o.auction_step,
    o.final_price,
    prev.start_price                                                   AS start_price_prev,
    CASE WHEN prev.start_price > 0
         THEN round((o.start_price - prev.start_price) / prev.start_price * 100, 1)
    END                                                                AS start_price_delta_pct,
    CASE WHEN o.start_price > 0 AND o.final_price IS NOT NULL
         THEN round((o.final_price - o.start_price) / o.start_price * 100, 1)
    END                                                                AS final_price_delta_pct,
    o.status_text,
    o.request_start_date,
    o.request_end_date,
    o.tender_date,
    o.final_date,
    CASE WHEN o.request_end_date IS NOT NULL
         THEN (o.request_end_date::date - CURRENT_DATE)
    END                                                                AS days_left,
    (
        (o.request_end_date IS NOT NULL AND o.request_end_date > now())
        OR (o.tender_date IS NOT NULL AND o.tender_date > now())
    )                                                                  AS is_live,
    o.platform_link,
    o.torgi_gov_link,
    o.latitude,
    o.longitude,
    COALESCE(o.photos, '{}')                                           AS photos,
    coalesce(array_length(o.photos, 1), 0)                             AS photos_count,
    COALESCE(o.metro, '[]'::jsonb)                                     AS metro,
    o.details,
    o.portal_views,
    (fav.lot_id IS NOT NULL)                                           AS is_favorite,
    o."version",
    o.updated_at,
    o.source_updated_at
FROM torgi_objects o
LEFT JOIN LATERAL (
    SELECT hp.start_price
    FROM hp
    WHERE hp.lot_id = o.lot_id AND hp.version < o."version"
    ORDER BY hp.version DESC
    LIMIT 1
) prev ON true
LEFT JOIN torgi_object_favorites fav
    ON fav.lot_id = o.lot_id AND fav.user_id = :user_id
WHERE (CAST(:lot_id AS integer) IS NULL OR o.lot_id = CAST(:lot_id AS integer))
  AND (
        CAST(:object_type AS text) IS NULL
        OR o.object_type_name = CAST(:object_type AS text)
      )
  AND (CAST(:district AS text) IS NULL OR o.district_name = CAST(:district AS text))
  AND (CAST(:region AS text) IS NULL OR o.region_name = CAST(:region AS text))
  AND (NOT CAST(:fav_only AS boolean) OR fav.lot_id IS NOT NULL)
  AND (
        NOT CAST(:live_only AS boolean)
        OR (o.request_end_date IS NOT NULL AND o.request_end_date > now())
        OR (o.tender_date IS NOT NULL AND o.tender_date > now())
      )
  AND (
        NOT CAST(:sold_only AS boolean)
        OR o.final_price IS NOT NULL
      )
  AND (
        NOT CAST(:price_drop_only AS boolean)
        OR (prev.start_price IS NOT NULL AND o.start_price < prev.start_price)
      )
  AND (CAST(:min_price AS numeric) IS NULL OR o.start_price >= CAST(:min_price AS numeric))
  AND (CAST(:max_price AS numeric) IS NULL OR o.start_price <= CAST(:max_price AS numeric))
  AND (CAST(:min_area AS numeric) IS NULL OR o.object_area >= CAST(:min_area AS numeric))
  AND (CAST(:max_area AS numeric) IS NULL OR o.object_area <= CAST(:max_area AS numeric))
  AND (CAST(:rooms AS integer) IS NULL OR o.rooms_count = CAST(:rooms AS integer))
  AND (
        CAST(:q AS text) IS NULL
        OR o.name ILIKE CAST(:q_like AS text)
        OR o.address ILIKE CAST(:q_like AS text)
        OR o.cadastral_number ILIKE CAST(:q_like AS text)
        OR o.lot_id::text = CAST(:q AS text)
      )
ORDER BY
    -- живые лоты вперёд, внутри — те, где приём заявок кончается раньше
    (
        (o.request_end_date IS NOT NULL AND o.request_end_date > now())
        OR (o.tender_date IS NOT NULL AND o.tender_date > now())
    ) DESC,
    o.request_end_date NULLS LAST,
    o.lot_id DESC
LIMIT CAST(:limit AS integer)
