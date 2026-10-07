-- KPI сводки торгов + заполненность полей одной строкой: сервис режет её на
-- блоки kpi и data_quality. :preset_regexes — массив regex из PRESETS
-- (src/plates.py), не из пользовательского ввода.
WITH d AS (
    SELECT
        tl.*,
        CASE WHEN tl.final_price IS NOT NULL AND tl.start_price > 0
             THEN (tl.final_price - tl.start_price) / tl.start_price * 100
        END AS delta_pct,
        EXISTS (
            SELECT 1 FROM unnest(CAST(:preset_regexes AS text[])) AS r
            WHERE tl.plate_norm ~ r
        ) AS interesting,
        EXISTS (
            SELECT 1 FROM plate_watches pw
            WHERE pw.user_id = :user_id AND tl.plate_norm ~ pw.regex
        ) AS my_match
    FROM torgi_lots tl
)
SELECT
    count(*)                                                             AS lots,
    count(*) FILTER (WHERE status_text = 'Прием заявок')                 AS open_lots,
    count(*) FILTER (WHERE final_price IS NOT NULL)                      AS sold_lots,
    round(avg(start_price))                                              AS avg_start_price,
    round(sum(start_price))                                              AS sum_start_price,
    round(sum(final_price))                                              AS sum_final_price,
    round(
        percentile_cont(0.5) WITHIN GROUP (ORDER BY delta_pct)::numeric, 1
    )                                                                    AS median_final_delta_pct,
    count(*) FILTER (WHERE COALESCE(plate_norm, '') <> '')               AS with_plate,
    count(*) FILTER (WHERE interesting)                                  AS interesting_plates,
    count(*) FILTER (WHERE my_match)                                     AS watch_matches,
    round(
        avg(
            EXTRACT(epoch FROM (tender_date - request_start_date)) / 86400
        )::numeric, 1
    )                                                                    AS avg_days_request_to_tender,
    round(
        count(*) FILTER (WHERE COALESCE(array_length(photos, 1), 0) > 0)::numeric
        / NULLIF(count(*), 0) * 100, 1
    )                                                                    AS photos_coverage_pct,
    (
        SELECT count(DISTINCT lot_id) FROM torgi_lots_history
        WHERE "version" > 1 AND updated_at >= now() - interval '24 hours'
    )                                                                    AS changed_24h,
    -- данные торгов обновляет отдельная джоба; своей таблицы прогонов у неё нет,
    -- поэтому отметка времени — последнее изменение самих лотов
    (SELECT max(greatest(created_at, updated_at)) FROM torgi_lots)        AS last_refresh,
    -- заполненность процентами 0–100: доли фронт не рисует
    round(count(*) FILTER (WHERE COALESCE(plate_norm, '') <> '')::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS plate,
    round(count(*) FILTER (WHERE COALESCE(vin, '') <> '')::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS vin,
    round(count(*) FILTER (WHERE COALESCE(pts, '') <> '')::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS pts,
    round(count(*) FILTER (WHERE COALESCE(array_length(photos, 1), 0) > 0)::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS photos,
    round(count(*) FILTER (WHERE COALESCE(video_link, '') <> '')::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS video,
    round(count(*) FILTER (
              WHERE COALESCE(latitude, '') <> '' AND COALESCE(longitude, '') <> ''
          )::numeric / NULLIF(count(*), 0) * 100, 1)                     AS coords
FROM d;
