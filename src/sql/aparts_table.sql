WITH cur AS (
    SELECT
        new_apart_id,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(TRIM(COALESCE(price_with_discount, '')), '') IS NOT NULL AS has_discount
    FROM new_aparts
),
hp AS (
    SELECT
        new_apart_id,
        version,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(TRIM(COALESCE(price_with_discount, '')), '') IS NOT NULL AS had_discount
    FROM new_aparts_history
)
SELECT
    na.new_apart_id,
    na.address, na.building, na.building_id, na."number", na.rooms, na."floor", na.area,
    cur.price_num                                                        AS price,
    prev.price_num                                                       AS price_prev,
    (cur.price_num - prev.price_num)                                     AS price_delta_prev,
    CASE WHEN prev.price_num > 0
         THEN round((cur.price_num - prev.price_num) / prev.price_num * 100, 1)
    END                                                                  AS price_delta_prev_pct,
    mx.price_max,
    CASE WHEN mx.price_max > 0
         THEN round((cur.price_num - mx.price_max) / mx.price_max * 100, 1)
    END                                                                  AS price_delta_max_pct,
    cur.has_discount,
    (cur.has_discount AND NOT COALESCE(prev.had_discount, false))        AS discount_is_new,
    NULLIF(regexp_replace(COALESCE(na.percentage_discount, ''), '\D', '', 'g'), '')::numeric
                                                                        AS discount_pct,
    (fav.new_apart_id IS NOT NULL)                                       AS is_favorite,
    concat(
        'https://xn--80aae5aibotfo5h.xn--p1ai/obekty/',
        na.building_code, '/?flat_id=', na.new_apart_id
    )                                                                    AS mosres_url,
    na.updated_at
FROM new_aparts na
JOIN cur ON cur.new_apart_id = na.new_apart_id
LEFT JOIN LATERAL (
    SELECT hp.price_num, hp.had_discount
    FROM hp
    WHERE hp.new_apart_id = na.new_apart_id AND hp.version < na."version"
    ORDER BY hp.version DESC
    LIMIT 1
) prev ON true
LEFT JOIN LATERAL (
    SELECT max(hp.price_num) AS price_max
    FROM hp WHERE hp.new_apart_id = na.new_apart_id
) mx ON true
LEFT JOIN favorites fav ON fav.new_apart_id = na.new_apart_id
WHERE (
        CAST(:building_id AS integer) IS NULL
        OR (na.building_id ~ '^\d+$' AND (na.building_id)::int = CAST(:building_id AS integer))
      )
  AND (NOT CAST(:favorites_only AS boolean) OR fav.new_apart_id IS NOT NULL)
  AND (NOT CAST(:discount_only AS boolean) OR cur.has_discount)
  AND (
        NOT CAST(:price_drop_only AS boolean)
        OR (prev.price_num IS NOT NULL AND cur.price_num < prev.price_num)
      )
  AND (
        CAST(:q AS text) IS NULL
        OR na.address ILIKE CAST(:q_like AS text)
        OR na.building ILIKE CAST(:q_like AS text)
        OR na."number" ILIKE CAST(:q_like AS text)
      )
ORDER BY na.new_apart_id;
