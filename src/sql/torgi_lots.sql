-- Лоты torgi.mos.ru (транспорт) с динамикой цены по истории версий,
-- избранным и попаданиями номера под паттерны текущего пользователя.
WITH hp AS (
    SELECT lot_id, version, start_price, status_text
    FROM torgi_lots_history
)
SELECT
    tl.lot_id,
    tl.name,
    tl.status_text,
    (tl.status_text = 'Прием заявок')                                    AS is_open,
    tl.transport_category,
    tl.brand,
    tl.model,
    tl.year,
    tl.plate,
    tl.plate_norm,
    tl.plate_region,
    tl.plate_valid,
    tl.vin,
    tl.pts,
    tl.color,
    tl.body,
    tl.eco_class,
    tl.power,
    tl.engine_volume,
    tl.drive,
    tl.transmission,
    tl.mileage,
    tl.start_price,
    tl.deposit,
    tl.auction_step,
    tl.final_price,
    prev.start_price                                                     AS start_price_prev,
    CASE WHEN prev.start_price > 0
         THEN round((tl.start_price - prev.start_price) / prev.start_price * 100, 1)
    END                                                                  AS start_price_delta_pct,
    CASE WHEN tl.final_price IS NOT NULL AND tl.start_price > 0
         THEN round((tl.final_price - tl.start_price) / tl.start_price * 100, 1)
    END                                                                  AS final_price_delta_pct,
    tl.request_start_date,
    tl.request_end_date,
    tl.tender_date,
    tl.final_date,
    CASE WHEN tl.request_end_date IS NOT NULL
         THEN (tl.request_end_date::date - CURRENT_DATE)
    END                                                                  AS days_left,
    tl.platform_link,
    tl.torgi_gov_link,
    tl.video_link,
    tl.latitude,
    tl.longitude,
    COALESCE(tl.photos, ARRAY[]::text[])                                 AS photos,
    coalesce(array_length(tl.photos, 1), 0)                              AS photos_count,
    tl.portal_views,
    COALESCE(tl.url, 'https://torgi.mos.ru/tender/' || tl.lot_id)        AS torgi_url,
    (fav.lot_id IS NOT NULL)                                             AS is_favorite,
    COALESCE(w.masks, ARRAY[]::text[])                                   AS matched_masks,
    -- created_at строки = момент, когда лот впервые увидели, то есть первая версия
    (tl.created_at >= now() - interval '24 hours')                       AS is_new,
    tl."version",
    tl.updated_at
FROM torgi_lots tl
LEFT JOIN LATERAL (
    SELECT hp.start_price
    FROM hp
    WHERE hp.lot_id = tl.lot_id AND hp.version < tl."version"
    ORDER BY hp.version DESC
    LIMIT 1
) prev ON true
LEFT JOIN torgi_favorites fav
       ON fav.lot_id = tl.lot_id AND fav.user_id = :user_id
LEFT JOIN LATERAL (
    SELECT array_agg(COALESCE(pw.label, pw.mask) ORDER BY pw.id) AS masks
    FROM plate_watches pw
    WHERE pw.user_id = :user_id AND tl.plate_norm ~ pw.regex
) w ON true
WHERE (CAST(:lot_id AS integer) IS NULL OR tl.lot_id = CAST(:lot_id AS integer))
  AND (NOT CAST(:open_only AS boolean) OR tl.status_text = 'Прием заявок')
  AND (CAST(:status AS text) IS NULL OR tl.status_text = CAST(:status AS text))
  AND (
        CAST(:category AS text) IS NULL
        OR tl.transport_category = CAST(:category AS text)
      )
  AND (CAST(:brand AS text) IS NULL OR tl.brand ILIKE CAST(:brand AS text))
  AND (CAST(:year_min AS integer) IS NULL OR tl.year >= CAST(:year_min AS integer))
  AND (CAST(:year_max AS integer) IS NULL OR tl.year <= CAST(:year_max AS integer))
  AND (CAST(:min_price AS numeric) IS NULL OR tl.start_price >= CAST(:min_price AS numeric))
  AND (CAST(:max_price AS numeric) IS NULL OR tl.start_price <= CAST(:max_price AS numeric))
  AND (
        CAST(:max_mileage AS integer) IS NULL
        OR (tl.mileage IS NOT NULL AND tl.mileage <= CAST(:max_mileage AS integer))
      )
  AND (
        NOT CAST(:price_drop_only AS boolean)
        OR (prev.start_price IS NOT NULL AND tl.start_price < prev.start_price)
      )
  AND (NOT CAST(:with_plate_only AS boolean) OR COALESCE(tl.plate, '') <> '')
  AND (NOT CAST(:fav_only AS boolean) OR fav.lot_id IS NOT NULL)
  AND (NOT CAST(:watch_only AS boolean) OR w.masks IS NOT NULL)
  AND (NOT CAST(:valid_plate_only AS boolean) OR tl.plate_valid)
  AND (
        CAST(:plate_region AS text) IS NULL
        OR tl.plate_region = CAST(:plate_region AS text)
      )
  AND (
        CAST(:q AS text) IS NULL
        OR tl.name ILIKE CAST(:q_like AS text)
        OR tl.brand ILIKE CAST(:q_like AS text)
        OR tl.model ILIKE CAST(:q_like AS text)
        OR tl.plate ILIKE CAST(:q_like AS text)
        OR tl.plate_norm ILIKE CAST(:q_like AS text)
        OR tl.vin ILIKE CAST(:q_like AS text)
      )
ORDER BY tl.lot_id;
