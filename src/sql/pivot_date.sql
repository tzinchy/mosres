-- Historical state per day: for each apartment take its latest version as of the
-- day, then aggregate every pivot metric. One row per day in [:date_from, :date_to].
WITH fav AS (
    SELECT new_apart_id FROM favorites
),
days AS (
    SELECT generate_series(
        CAST(:date_from AS date),
        CAST(:date_to AS date),
        interval '1 day'
    )::date AS d
),
-- ponytail: O(days × history_rows) join. Fine at this scale.
latest AS (
    SELECT
        days.d,
        nah.new_apart_id,
        COALESCE(nah.reserve, 0) AS reserve,
        (
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) AS disc,
        (COALESCE(nah.property, '') ILIKE '%семейн%') AS fam,
        (nah.auction IS NOT NULL) AS auc,
        NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric AS price_num,
        NULLIF(regexp_replace(nah.price_m, '\D', '', 'g'), '')::numeric AS pm_num,
        row_number() OVER (
            PARTITION BY days.d, nah.new_apart_id ORDER BY nah.version DESC
        ) AS rn
    FROM days
    LEFT JOIN new_aparts_history nah
        ON nah.updated_at::date <= days.d
       AND (
            NOT CAST(:favorites_only AS boolean)
            OR nah.new_apart_id IN (SELECT new_apart_id FROM fav)
       )
)
SELECT
    d::text AS key,
    count(new_apart_id) FILTER (WHERE rn = 1)                  AS count,
    count(new_apart_id) FILTER (WHERE rn = 1 AND reserve = 1)  AS reserved,
    count(new_apart_id) FILTER (WHERE rn = 1 AND disc)         AS discounted,
    count(new_apart_id) FILTER (WHERE rn = 1 AND fam)          AS family,
    count(new_apart_id) FILTER (WHERE rn = 1 AND auc)          AS auction,
    round(avg(price_num) FILTER (WHERE rn = 1))                AS avg_price,
    round(avg(pm_num) FILTER (WHERE rn = 1))                   AS avg_price_m
FROM latest
GROUP BY d
ORDER BY d;
