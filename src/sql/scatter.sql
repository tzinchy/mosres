-- One row per apartment for the scatter explorer: area × price, tagged with
-- district and room count. Current snapshot from new_aparts.
SELECT
    na.new_apart_id,
    na.address,
    COALESCE(d.name, 'Прочие') AS district,
    CASE
        WHEN COALESCE(na.rooms, '0') IN ('0', '') THEN 'Студия'
        ELSE na.rooms || '-комн'
    END AS rooms,
    NULLIF(regexp_replace(COALESCE(na.area, ''), '[^0-9.]', '', 'g'), '')::numeric AS area,
    NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric AS price,
    NULLIF(regexp_replace(na.price_m, '\D', '', 'g'), '')::numeric AS price_m
FROM new_aparts na
LEFT JOIN buildings b ON b.building_id = na.building_id::int
LEFT JOIN districts d ON d.district_id = b.county
WHERE (
        NOT CAST(:favorites_only AS boolean)
        OR na.new_apart_id IN (SELECT new_apart_id FROM favorites)
      )
  AND NULLIF(regexp_replace(COALESCE(na.area, ''), '[^0-9.]', '', 'g'), '')::numeric > 0
  AND NULLIF(regexp_replace(na.price, '\D', '', 'g'), '')::numeric > 0;
