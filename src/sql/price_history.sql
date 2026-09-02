SELECT
    COALESCE(d.name, 'Прочие')            AS district,
    bps.snapshot_date                     AS day,
    round(avg(bps.avg_price_m))           AS avg_price_m,
    round(min(bps.min_price_m))           AS min_price_m,
    sum(bps.apart_count)                  AS aparts
FROM building_price_stats bps
JOIN buildings b ON b.building_id = bps.building_id
LEFT JOIN districts d ON d.district_id = b.county
WHERE bps.avg_price_m IS NOT NULL
GROUP BY COALESCE(d.name, 'Прочие'), bps.snapshot_date
ORDER BY bps.snapshot_date, district;
