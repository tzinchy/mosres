WITH a AS (
    SELECT
        (na.building_id)::int AS bid,
        NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric AS pm,
        COALESCE(na.reserve, 0) AS reserve,
        (
            NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric
        ) AS has_disc,
        (COALESCE(na.property, '') ILIKE '%семейн%') AS is_family,
        na.version,
        na.created_at
    FROM new_aparts na
    WHERE na.building_id ~ '^\d+$'
)
SELECT
    b.building_id,
    b.address,
    CASE b.status_code
        WHEN 'PROCESSING' THEN 'Строится'
        WHEN 'FINISHED'   THEN 'Введён в эксплуатацию'
        ELSE b.status_code
    END AS status_label,
    CASE
        WHEN b.img ~ '^/' THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || b.img
        WHEN COALESCE(b.img, '') <> '' THEN b.img
    END AS img_url,
    count(a.*)                                            AS aparts,
    round(avg(a.price_num))                               AS avg_price,
    round(min(a.price_num))                               AS min_price,
    round(avg(a.pm))                                      AS avg_price_m,
    count(a.*) FILTER (WHERE a.reserve = 1)               AS reserved,
    count(a.*) FILTER (WHERE a.has_disc)                  AS with_discount,
    count(a.*) FILTER (WHERE a.is_family)                 AS family,
    count(a.*) FILTER (
        WHERE a.version = 1 AND a.created_at > now() - interval '7 days'
    )                                                    AS new_week,
    count(DISTINCT f.new_apart_id)                        AS favorites_count
FROM buildings b
LEFT JOIN a ON a.bid = b.building_id
LEFT JOIN favorites f ON f.new_apart_id IN (
    SELECT na3.new_apart_id FROM new_aparts na3
    WHERE na3.building_id ~ '^\d+$' AND (na3.building_id)::int = b.building_id
)
GROUP BY b.building_id, b.address, b.status_code, b.img
HAVING count(a.*) > 0
ORDER BY count(a.*) FILTER (WHERE a.has_disc) DESC, b.address;
