-- Три гистограммы одним запросом: Δ итог/начало, год выпуска, пробег.
-- Таблицы бакетов слева, чтобы пустые бакеты не выпадали из графика.
WITH d AS (
    SELECT
        year,
        mileage,
        CASE WHEN final_price IS NOT NULL AND start_price > 0
             THEN (final_price - start_price) / start_price * 100
        END AS delta_pct
    FROM torgi_lots
),
disc(ord, bucket) AS (VALUES
    (0, '< −50%'), (1, '−50…−25%'), (2, '−25…0%'), (3, '0…25%'), (4, '25…50%'),
    (5, '50…100%'), (6, '100…200%'), (7, '200…500%'), (8, '500%+')
),
mil(ord, bucket) AS (VALUES
    (0, '< 10 тыс.'), (1, '10–50 тыс.'), (2, '50–100 тыс.'),
    (3, '100–200 тыс.'), (4, '200–300 тыс.'), (5, '300 тыс.+')
)
SELECT 'discount' AS kind, disc.ord, disc.bucket, count(d.delta_pct) AS lots
FROM disc
LEFT JOIN d
       ON d.delta_pct IS NOT NULL
      AND width_bucket(d.delta_pct, ARRAY[-50, -25, 0, 25, 50, 100, 200, 500]::numeric[]) = disc.ord
GROUP BY 1, 2, 3
UNION ALL
SELECT 'mileage', mil.ord, mil.bucket, count(d.mileage)
FROM mil
LEFT JOIN d
       ON d.mileage IS NOT NULL
      AND width_bucket(
              d.mileage::numeric,
              ARRAY[10000, 50000, 100000, 200000, 300000]::numeric[]
          ) = mil.ord
GROUP BY 1, 2, 3
UNION ALL
SELECT 'year', d.year, d.year::text, count(*)
FROM d
WHERE d.year IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 1, 2;
