-- Flow counts for the Sankey: округ → комнатность → ценовой диапазон.
SELECT
    COALESCE(d.name, 'Прочие') AS district,
    CASE
        WHEN COALESCE(na.rooms, '0') IN ('0', '') THEN 'Студия'
        ELSE na.rooms || '-комн'
    END AS rooms,
    CASE
        WHEN na.p < 10000000 THEN 'до 10 млн'
        WHEN na.p < 15000000 THEN '10–15 млн'
        WHEN na.p < 20000000 THEN '15–20 млн'
        WHEN na.p < 30000000 THEN '20–30 млн'
        WHEN na.p < 50000000 THEN '30–50 млн'
        ELSE '50+ млн'
    END AS bucket,
    count(*) AS count
FROM (
    SELECT
        n.new_apart_id, n.rooms, n.building_id,
        NULLIF(regexp_replace(n.price, '\D', '', 'g'), '')::numeric AS p
    FROM new_aparts n
) na
LEFT JOIN buildings b ON b.building_id = na.building_id::int
LEFT JOIN districts d ON d.district_id = b.county
WHERE (
        NOT CAST(:favorites_only AS boolean)
        OR na.new_apart_id IN (SELECT new_apart_id FROM favorites)
      )
  AND na.p > 0
GROUP BY 1, 2, 3;
