SELECT
    m.metro_id,
    m.name,
    m.color,
    count(*)                                              AS aparts,
    count(*) FILTER (WHERE fav.new_apart_id IS NOT NULL)  AS favorites,
    count(*) FILTER (WHERE x.disc)                        AS with_discount,
    count(*) FILTER (WHERE COALESCE(na.reserve, 0) = 1)   AS reserved,
    round(avg(x.pm) FILTER (WHERE x.pm IS NOT NULL))      AS avg_price_m
FROM new_aparts na
JOIN buildings b
    ON na.building_id ~ '^\d+$' AND (na.building_id)::int = b.building_id
CROSS JOIN LATERAL unnest(COALESCE(b.metro, ARRAY[]::text[])) AS mid(id)
JOIN metros m ON mid.id ~ '^\d+$' AND m.metro_id = mid.id::int
LEFT JOIN favorites fav ON fav.new_apart_id = na.new_apart_id
CROSS JOIN LATERAL (
    SELECT
        NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric AS pm,
        (
            NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric
        ) AS disc
) x
GROUP BY m.metro_id, m.name, m.color
ORDER BY count(*) FILTER (WHERE x.disc) DESC, count(*) DESC;
