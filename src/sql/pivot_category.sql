-- Current snapshot of new_aparts grouped by one category. {key} is substituted
-- from a whitelist in the service layer (never user input). buildings/districts
-- are always joined so any dimension can also be scoped to one округ.
SELECT
    {key} AS key,
    count(*) AS count,
    count(*) FILTER (WHERE COALESCE(na.reserve, 0) = 1) AS reserved,
    count(*) FILTER (
        WHERE NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
          AND NULLIF(regexp_replace(COALESCE(na.price_with_discount, ''), '\D', '', 'g'), '')::numeric
              < NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric
    ) AS discounted,
    count(*) FILTER (WHERE COALESCE(na.property, '') ILIKE '%семейн%') AS family,
    count(*) FILTER (WHERE na.auction IS NOT NULL) AS auction,
    round(avg(NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric)) AS avg_price,
    round(avg(NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric)) AS avg_price_m
FROM new_aparts na
LEFT JOIN buildings b ON b.building_id = na.building_id::int
LEFT JOIN districts d ON d.district_id = b.county
WHERE (
        NOT CAST(:favorites_only AS boolean)
        OR na.new_apart_id IN (SELECT new_apart_id FROM favorites)
      )
  AND (CAST(:district AS text) IS NULL OR d.name = CAST(:district AS text))
GROUP BY 1
ORDER BY count DESC
LIMIT 40;
