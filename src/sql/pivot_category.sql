-- Current snapshot of new_aparts grouped by one category. {key} and {join} are
-- substituted from a whitelist in the service layer (never user input).
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
    round(avg(NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric)) AS avg_price,
    round(avg(NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric)) AS avg_price_m
FROM new_aparts na
{join}
WHERE NOT CAST(:favorites_only AS boolean)
   OR na.new_apart_id IN (SELECT new_apart_id FROM favorites)
GROUP BY 1
ORDER BY count DESC
LIMIT 40;
