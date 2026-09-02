WITH fav AS (
    SELECT new_apart_id FROM favorites
),
scope AS (
    SELECT
        na.*,
        NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric AS pm
    FROM new_aparts na
    WHERE NOT CAST(:favorites_only AS boolean)
       OR na.new_apart_id IN (SELECT new_apart_id FROM fav)
),
h AS (
    SELECT
        nah.new_apart_id,
        nah.version,
        nah.updated_at,
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
today AS (
    SELECT * FROM h WHERE updated_at::date = now()::date
)
SELECT
    (SELECT count(*) FROM scope)                                   AS aparts_total,
    (SELECT count(*) FROM fav)                                     AS favorites_total,
    (SELECT count(DISTINCT (building_id)::int) FROM scope WHERE building_id ~ '^\d+$')
                                                                  AS buildings_total,
    (SELECT count(*) FROM scope WHERE COALESCE(reserve, 0) = 1)    AS reserved_total,
    (SELECT count(*) FROM scope
        WHERE NULLIF(regexp_replace(COALESCE(price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
          AND NULLIF(regexp_replace(COALESCE(price_with_discount, ''), '\D', '', 'g'), '')::numeric < price_num)
                                                                  AS discount_total,
    (SELECT count(*) FROM scope WHERE COALESCE(property, '') ILIKE '%семейн%')
                                                                  AS family_total,
    (SELECT round(sum(price_num)) FROM scope)                      AS portfolio_value,
    (SELECT round(avg(price_num)) FROM scope)                      AS avg_price,
    (SELECT round(avg(pm)) FROM scope)                             AS avg_price_m,
    count(*) FILTER (WHERE version = 1)                            AS new_today,
    count(*) FILTER (WHERE version > 1)                            AS changed_today,
    count(*) FILTER (WHERE prev_price IS NOT NULL AND price_num < prev_price)
                                                                  AS price_drops_today,
    count(*) FILTER (WHERE prev_price IS NOT NULL AND price_num > prev_price)
                                                                  AS price_rises_today,
    round(
        avg((price_num - prev_price) / prev_price * 100)
        FILTER (WHERE prev_price > 0 AND price_num <> prev_price),
        2
    )                                                             AS avg_price_change_pct_today,
    count(*) FILTER (WHERE has_disc AND prev_disc IS NOT TRUE AND version > 1)
                                                                  AS discounts_appeared_today,
    count(*) FILTER (WHERE reserve = 1 AND prev_reserve = 0 AND version > 1)
                                                                  AS reserved_today,
    count(*) FILTER (WHERE reserve = 0 AND prev_reserve = 1)       AS unreserved_today
FROM today;
