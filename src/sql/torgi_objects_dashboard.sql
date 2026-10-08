-- KPI сводки по недвижимости + заполненность полей одной строкой: сервис
-- режет её на блоки kpi и data_quality.
-- «Актуальный» лот — приём заявок идёт либо торги впереди; status_text для
-- этого не годится: он приходит из карточки, а карточки архива читаются
-- порциями (см. src/torgi_objects.py).
-- Комнаты, год постройки, кадастр и метро бывают не у всех типов: у участка
-- комнат нет, у киоска нет года постройки. Полноту таких полей считаем только
-- по типам, где портал заполняет поле хотя бы у 5 % лотов, иначе «20 % комнат»
-- выглядит как дыра в данных, хотя это просто квартиры среди прочего.
WITH applicable AS (
    SELECT
        object_type_name,
        avg((rooms_count IS NOT NULL)::int) >= 0.05                       AS rooms,
        avg((build_year IS NOT NULL)::int) >= 0.05                        AS build_year,
        avg((COALESCE(cadastral_number, '') <> '')::int) >= 0.05          AS cadastral,
        avg((metro IS NOT NULL AND metro <> '[]'::jsonb)::int) >= 0.05    AS metro
    FROM torgi_objects
    GROUP BY 1
),
d AS (
    SELECT
        o.*,
        o.tender_type_code = 'nsi:tender_type_portal:13'                  AS is_sale,
        o.status_text IN (
            'Признаны состоявшимися', 'Признаны несостоявшимися', 'Единственный участник'
        )                                                                 AS is_finished,
        o.status_text IN ('Признаны состоявшимися', 'Единственный участник')
            AND o.final_price > 0                                         AS is_sold,
        COALESCE(a.rooms, false)      AS ok_rooms,
        COALESCE(a.build_year, false) AS ok_build_year,
        COALESCE(a.cadastral, false)  AS ok_cadastral,
        COALESCE(a.metro, false)      AS ok_metro,
        (
            (o.request_end_date IS NOT NULL AND o.request_end_date > now())
            OR (o.tender_date IS NOT NULL AND o.tender_date > now())
        ) AS is_live,
        CASE WHEN o.final_price IS NOT NULL AND o.start_price > 0
             THEN (o.final_price - o.start_price) / o.start_price * 100
        END AS delta_pct
    FROM torgi_objects o
    LEFT JOIN applicable a ON a.object_type_name = o.object_type_name
)
SELECT
    count(*)                                                             AS lots,
    count(*) FILTER (WHERE is_live)                                      AS live_lots,
    count(*) FILTER (WHERE final_price IS NOT NULL)                      AS sold_lots,
    count(DISTINCT object_type_name)                                     AS object_types,
    round(avg(start_price) FILTER (WHERE start_price > 0))               AS avg_start_price,
    round(sum(start_price))                                              AS sum_start_price,
    round(sum(final_price))                                              AS sum_final_price,
    -- сумма начальных цен только у проданных лотов: сравнивать итог можно
    -- лишь с ней, а не с суммой по всем лотам, среди которых и несостоявшиеся
    round(sum(start_price) FILTER (WHERE final_price IS NOT NULL))       AS sum_start_price_sold,
    -- исход продаж (не аренды и прочих форм) среди завершённых торгов
    round(count(*) FILTER (WHERE is_sale AND is_sold)::numeric
          / NULLIF(count(*) FILTER (WHERE is_sale AND is_finished), 0), 3)
                                                                         AS sold_share,
    round(count(*) FILTER (WHERE is_sale AND is_sold AND final_price = start_price)::numeric
          / NULLIF(count(*) FILTER (WHERE is_sale AND is_sold), 0), 3)   AS at_start_share,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_square)
          FILTER (WHERE object_type_name = 'Квартира' AND price_per_square > 0))
                                                                         AS apartment_median_ppm,
    round(
        percentile_cont(0.5) WITHIN GROUP (ORDER BY delta_pct)::numeric, 1
    )                                                                    AS median_final_delta_pct,
    round(avg(object_area) FILTER (WHERE object_area > 0), 1)            AS avg_area,
    round(avg(price_per_square) FILTER (WHERE price_per_square > 0))     AS avg_price_per_square,
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
        SELECT count(DISTINCT lot_id) FROM torgi_objects_history
        WHERE "version" > 1 AND updated_at >= now() - interval '24 hours'
    )                                                                    AS changed_24h,
    -- просмотры на портале: счётчик копится с публикации лота, поэтому сумма
    -- показывает совокупный интерес, а медиана — типичный лот (среднее тянут
    -- вверх несколько очень популярных)
    sum(portal_views)                                                    AS sum_portal_views,
    round(avg(portal_views) FILTER (WHERE portal_views > 0))              AS avg_portal_views,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY portal_views)             AS median_portal_views,
    max(portal_views)                                                    AS max_portal_views,
    -- своей таблицы прогонов у источника нет: отметка времени — последнее
    -- изменение самих лотов
    (SELECT max(greatest(created_at, updated_at)) FROM torgi_objects)     AS last_refresh,
    -- заполненность в процентах 0–100: доли фронт не рисует
    round(count(*) FILTER (WHERE COALESCE(address, '') <> '')::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS address,
    round(count(*) FILTER (WHERE object_area > 0)::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS area,
    round(count(*) FILTER (WHERE ok_rooms AND rooms_count IS NOT NULL)::numeric
          / NULLIF(count(*) FILTER (WHERE ok_rooms), 0) * 100, 1)        AS rooms,
    count(*) FILTER (WHERE ok_rooms)                                     AS rooms_of,
    round(count(*) FILTER (
              WHERE ok_cadastral AND COALESCE(cadastral_number, '') <> ''
          )::numeric / NULLIF(count(*) FILTER (WHERE ok_cadastral), 0) * 100, 1)
                                                                         AS cadastral,
    count(*) FILTER (WHERE ok_cadastral)                                 AS cadastral_of,
    round(count(*) FILTER (WHERE ok_build_year AND build_year IS NOT NULL)::numeric
          / NULLIF(count(*) FILTER (WHERE ok_build_year), 0) * 100, 1)   AS build_year,
    count(*) FILTER (WHERE ok_build_year)                                AS build_year_of,
    round(count(*) FILTER (WHERE COALESCE(array_length(photos, 1), 0) > 0)::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS photos,
    round(count(*) FILTER (
              WHERE COALESCE(latitude, '') <> '' AND COALESCE(longitude, '') <> ''
          )::numeric / NULLIF(count(*), 0) * 100, 1)                     AS coords,
    round(count(*) FILTER (
              WHERE ok_metro AND metro IS NOT NULL AND metro <> '[]'::jsonb
          )::numeric / NULLIF(count(*) FILTER (WHERE ok_metro), 0) * 100, 1)
                                                                         AS metro,
    count(*) FILTER (WHERE ok_metro)                                     AS metro_of,
    -- доля лотов, по которым карточка портала уже прочитана: архив
    -- дочитывается порциями, и это видно по этому числу
    round(count(*) FILTER (WHERE detail_fetched_at IS NOT NULL)::numeric
          / NULLIF(count(*), 0) * 100, 1)                                AS card
FROM d;
