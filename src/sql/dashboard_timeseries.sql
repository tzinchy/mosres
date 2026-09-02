WITH fav AS (
    SELECT new_apart_id FROM favorites
),
h AS (
    SELECT
        nah.new_apart_id,
        nah.version,
        nah.updated_at::date AS d,
        NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric AS price_num,
        (
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) AS has_disc,
        COALESCE(nah.reserve, 0) AS reserve,
        lag(NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric)
            OVER w AS prev_price,
        lag(
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) OVER w AS prev_disc,
        lag(COALESCE(nah.reserve, 0)) OVER w AS prev_reserve
    FROM new_aparts_history nah
    WHERE NOT CAST(:favorites_only AS boolean)
       OR nah.new_apart_id IN (SELECT new_apart_id FROM fav)
    WINDOW w AS (PARTITION BY nah.new_apart_id ORDER BY nah.version)
),
days AS (
    SELECT generate_series(
        now()::date - (CAST(:days AS integer) - 1),
        now()::date,
        interval '1 day'
    )::date AS d
)
SELECT
    days.d AS day,
    count(h.*) FILTER (WHERE h.version = 1)                          AS new_aparts,
    count(h.*) FILTER (WHERE h.version > 1)                          AS changes,
    count(h.*) FILTER (WHERE h.prev_price IS NOT NULL AND h.price_num < h.prev_price)
                                                                    AS drops,
    count(h.*) FILTER (WHERE h.prev_price IS NOT NULL AND h.price_num > h.prev_price)
                                                                    AS rises,
    count(h.*) FILTER (WHERE h.has_disc AND h.prev_disc IS NOT TRUE AND h.version > 1)
                                                                    AS new_discounts,
    count(h.*) FILTER (WHERE h.reserve = 1 AND h.prev_reserve = 0 AND h.version > 1)
                                                                    AS reserved,
    round(
        avg((h.price_num - h.prev_price) / h.prev_price * 100)
        FILTER (WHERE h.prev_price > 0 AND h.price_num <> h.prev_price),
        2
    )                                                               AS avg_change_pct
FROM days
LEFT JOIN h ON h.d = days.d
GROUP BY days.d
ORDER BY days.d;
