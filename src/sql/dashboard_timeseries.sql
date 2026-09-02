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
        (COALESCE(nah.property, '') ILIKE '%семейн%') AS fam,
        lag(NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric)
            OVER w AS prev_price,
        lag(
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) OVER w AS prev_disc,
        lag(COALESCE(nah.reserve, 0)) OVER w AS prev_reserve,
        lag(COALESCE(nah.property, '') ILIKE '%семейн%') OVER w AS prev_fam
    FROM new_aparts_history nah
    WHERE NOT CAST(:favorites_only AS boolean)
       OR nah.new_apart_id IN (SELECT new_apart_id FROM fav)
    WINDOW w AS (PARTITION BY nah.new_apart_id ORDER BY nah.version)
),
hx AS (
    SELECT
        *,
        (
            version > 1 AND (
                (prev_price IS NOT NULL AND price_num IS DISTINCT FROM prev_price)
                OR has_disc IS DISTINCT FROM COALESCE(prev_disc, FALSE)
                OR reserve IS DISTINCT FROM COALESCE(prev_reserve, 0)
                OR fam IS DISTINCT FROM COALESCE(prev_fam, FALSE)
            )
        ) AS is_change
    FROM h
),
days AS (
    SELECT generate_series(
        CAST(:date_from AS date),
        CAST(:date_to AS date),
        interval '1 day'
    )::date AS d
)
SELECT
    days.d AS day,
    count(hx.*) FILTER (WHERE hx.version = 1)                        AS new_aparts,
    count(hx.*) FILTER (WHERE hx.is_change)                          AS changes,
    count(hx.*) FILTER (WHERE hx.is_change AND hx.price_num < hx.prev_price)
                                                                    AS drops,
    count(hx.*) FILTER (WHERE hx.is_change AND hx.price_num > hx.prev_price)
                                                                    AS rises,
    count(hx.*) FILTER (WHERE hx.has_disc AND hx.prev_disc IS NOT TRUE AND hx.version > 1)
                                                                    AS new_discounts,
    count(hx.*) FILTER (WHERE hx.reserve = 1 AND hx.prev_reserve = 0 AND hx.version > 1)
                                                                    AS reserved,
    count(hx.*) FILTER (WHERE hx.fam AND hx.prev_fam IS NOT TRUE AND hx.version > 1)
                                                                    AS became_family,
    round(
        avg((hx.price_num - hx.prev_price) / hx.prev_price * 100)
        FILTER (WHERE hx.prev_price > 0 AND hx.price_num IS DISTINCT FROM hx.prev_price),
        2
    )                                                               AS avg_change_pct
FROM days
LEFT JOIN hx ON hx.d = days.d
GROUP BY days.d
ORDER BY days.d;
