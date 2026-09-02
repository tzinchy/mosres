WITH cur AS (
    SELECT
        new_apart_id,
        building_id,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(regexp_replace(price_m, '\D', '', 'g'), '')::numeric AS pm,
        NULLIF(regexp_replace(COALESCE(price_with_discount, ''), '\D', '', 'g'), '')::numeric AS disc_price
    FROM new_aparts
),
hp AS (
    SELECT
        new_apart_id,
        version,
        NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric AS price_num,
        (
            NULLIF(regexp_replace(COALESCE(price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(price, '\D', '', 'g'), '')::numeric
        ) AS had_discount
    FROM new_aparts_history
)
SELECT
    na.new_apart_id,
    na.address, na.building, na.building_id, na."number", na.rooms, na."floor", na.area,
    na.reserve,
    na.property,
    (COALESCE(na.property, '') ILIKE '%семейн%')                          AS is_family,
    cur.price_num                                                        AS price,
    cur.pm                                                               AS price_m,
    CASE WHEN cur.disc_price > 0 AND cur.disc_price < cur.price_num
         THEN cur.disc_price END                                         AS price_discounted,
    prev.price_num                                                       AS price_prev,
    (cur.price_num - prev.price_num)                                     AS price_delta_prev,
    CASE WHEN prev.price_num > 0
         THEN round((cur.price_num - prev.price_num) / prev.price_num * 100, 1)
    END                                                                  AS price_delta_prev_pct,
    mx.price_max,
    CASE WHEN mx.price_max > 0
         THEN round((cur.price_num - mx.price_max) / mx.price_max * 100, 1)
    END                                                                  AS price_delta_max_pct,
    COALESCE(cur.disc_price > 0 AND cur.disc_price < cur.price_num, false) AS has_discount,
    COALESCE(
        cur.disc_price > 0 AND cur.disc_price < cur.price_num
        AND NOT COALESCE(prev.had_discount, false),
        false
    )                                                                  AS discount_is_new,
    CASE
        WHEN NOT (cur.disc_price > 0 AND cur.disc_price < cur.price_num) THEN NULL
        WHEN NULLIF(regexp_replace(replace(COALESCE(na.percentage_discount, ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric > 0
            THEN round(
                NULLIF(regexp_replace(replace(na.percentage_discount, ',', '.'), '[^0-9.]', '', 'g'), '')::numeric,
                1
            )
        ELSE round((cur.price_num - cur.disc_price) / cur.price_num * 100, 1)
    END                                                                 AS discount_pct,
    (fav.new_apart_id IS NOT NULL)                                       AS is_favorite,
    (cmt.new_apart_id IS NOT NULL)                                       AS has_comment,
    CASE
        WHEN na.plan_s ~ '^/'  THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || na.plan_s
        WHEN COALESCE(na.plan_s, '') <> '' THEN na.plan_s
        WHEN na.plan ~ '^/'    THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || na.plan
        WHEN COALESCE(na.plan, '') <> '' THEN na.plan
    END                                                                  AS plan_url,
    CASE
        WHEN na.tour_3d ~ '^/'  THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || na.tour_3d
        WHEN COALESCE(na.tour_3d, '') <> '' THEN na.tour_3d
    END                                                                  AS tour_3d_url,
    CASE na."type"
        WHEN 'R'  THEN 'Квартира'
        WHEN 'NR' THEN 'Нежилое'
        WHEN 'P'  THEN 'Паркинг'
        ELSE na."type"
    END                                                                  AS type_label,
    COALESCE(mm.stops, '[]'::jsonb)                                       AS metro,
    b.family_hypotec                                                     AS family_hypotec,
    -- «выгода» = на сколько % ниже своего исторического максимума + размер текущей скидки, %
    round(
        COALESCE(GREATEST(0, -CASE WHEN mx.price_max > 0
            THEN (cur.price_num - mx.price_max) / mx.price_max * 100 END), 0)
        + CASE WHEN cur.disc_price > 0 AND cur.disc_price < cur.price_num
               THEN (cur.price_num - cur.disc_price) / cur.price_num * 100 ELSE 0 END,
        1
    )                                                                    AS deal_score,
    concat(
        'https://xn--80aae5aibotfo5h.xn--p1ai/obekty/',
        na.building_code, '/?flat_id=', na.new_apart_id
    )                                                                    AS mosres_url,
    na.updated_at
FROM new_aparts na
JOIN cur ON cur.new_apart_id = na.new_apart_id
LEFT JOIN buildings b
    ON na.building_id ~ '^\d+$' AND (na.building_id)::int = b.building_id
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', COALESCE(m.name, mid.id),
            'color', m.color,
            'car', b.metro_car[mid.ord],
            'walk', b.metro_walk[mid.ord]
        )
        ORDER BY mid.ord
    ) AS stops
    FROM unnest(b.metro) WITH ORDINALITY AS mid(id, ord)
    LEFT JOIN metros m ON m.metro_id = (CASE WHEN mid.id ~ '^\d+$' THEN mid.id::int END)
) mm ON true
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
LEFT JOIN LATERAL (
    SELECT c.new_apart_id FROM comments c WHERE c.new_apart_id = na.new_apart_id LIMIT 1
) cmt ON true
WHERE (
        CAST(:building_id AS integer) IS NULL
        OR (na.building_id ~ '^\d+$' AND (na.building_id)::int = CAST(:building_id AS integer))
      )
  AND (
        CAST(:building_ids AS text) IS NULL
        OR (na.building_id ~ '^\d+$' AND (na.building_id)::int = ANY(string_to_array(:building_ids, ',')::int[]))
      )
  AND (NOT CAST(:favorites_only AS boolean) OR fav.new_apart_id IS NOT NULL)
  AND (
        NOT CAST(:discount_only AS boolean)
        OR COALESCE(cur.disc_price > 0 AND cur.disc_price < cur.price_num, false)
      )
  AND (
        NOT CAST(:price_drop_only AS boolean)
        OR (prev.price_num IS NOT NULL AND cur.price_num < prev.price_num)
      )
  AND (NOT CAST(:reserved_only AS boolean) OR na.reserve = 1)
  AND (NOT CAST(:available_only AS boolean) OR COALESCE(na.reserve, 0) = 0)
  AND (NOT CAST(:family_only AS boolean) OR COALESCE(na.property, '') ILIKE '%семейн%')
  AND (NOT CAST(:comment_only AS boolean) OR cmt.new_apart_id IS NOT NULL)
  AND (CAST(:min_price AS numeric) IS NULL OR cur.price_num >= CAST(:min_price AS numeric))
  AND (CAST(:max_price AS numeric) IS NULL OR cur.price_num <= CAST(:max_price AS numeric))
  AND (
        CAST(:min_discount AS numeric) IS NULL
        OR (
            cur.disc_price > 0 AND cur.disc_price < cur.price_num
            AND (cur.price_num - cur.disc_price) / cur.price_num * 100
                >= CAST(:min_discount AS numeric)
        )
      )
  AND (
        CAST(:q AS text) IS NULL
        OR na.address ILIKE CAST(:q_like AS text)
        OR na.building ILIKE CAST(:q_like AS text)
        OR na."number" ILIKE CAST(:q_like AS text)
      )
ORDER BY na.new_apart_id;
