WITH fav AS (
    SELECT new_apart_id FROM favorites
),
h AS (
    SELECT
        nah.new_apart_id,
        nah.version,
        nah.updated_at,
        nah.address,
        nah.building,
        nah."number",
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
    WHERE nah.new_apart_id IN (SELECT new_apart_id FROM fav)
    WINDOW w AS (PARTITION BY nah.new_apart_id ORDER BY nah.version)
)
SELECT
    new_apart_id,
    version,
    updated_at,
    address,
    building,
    "number",
    price_num                                              AS price,
    prev_price,
    (prev_price IS NOT NULL AND price_num < prev_price)     AS price_down,
    (prev_price IS NOT NULL AND price_num > prev_price)     AS price_up,
    (has_disc AND NOT COALESCE(prev_disc, false))           AS discount_new,
    (NOT has_disc AND COALESCE(prev_disc, false))           AS discount_gone,
    (reserve = 1 AND prev_reserve = 0)                      AS reserved,
    (reserve = 0 AND prev_reserve = 1)                      AS unreserved
FROM h
WHERE version > 1
  AND updated_at >= now() - (CAST(:days AS integer) || ' days')::interval
  AND (
        price_num IS DISTINCT FROM prev_price
        OR has_disc <> COALESCE(prev_disc, false)
        OR reserve <> COALESCE(prev_reserve, 0)
      )
ORDER BY updated_at DESC, version DESC;
