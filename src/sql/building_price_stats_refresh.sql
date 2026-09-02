INSERT INTO building_price_stats
    (building_id, snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count)
SELECT
    building_id,
    now()::date,
    avg(price_m_num),
    min(price_m_num),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_m_num),
    count(*)
FROM (
    SELECT
        (building_id)::int AS building_id,
        NULLIF(regexp_replace(price_m, '\D', '', 'g'), '')::numeric AS price_m_num
    FROM new_aparts
    WHERE building_id ~ '^\d+$'
) s
WHERE price_m_num IS NOT NULL
GROUP BY building_id
ON CONFLICT (building_id, snapshot_date) DO UPDATE SET
    avg_price_m = EXCLUDED.avg_price_m,
    min_price_m = EXCLUDED.min_price_m,
    median_price_m = EXCLUDED.median_price_m,
    apart_count = EXCLUDED.apart_count;
