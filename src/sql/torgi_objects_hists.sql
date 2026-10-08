-- Три гистограммы одним запросом: площадь, цена за м², Δ итог/начало.
-- Таблицы бакетов слева, чтобы пустые бакеты не выпадали из графика.
WITH d AS (
    SELECT
        object_area,
        price_per_square,
        portal_views,
        CASE WHEN final_price IS NOT NULL AND start_price > 0
             THEN (final_price - start_price) / start_price * 100
        END AS delta_pct
    FROM torgi_objects
),
area(ord, bucket) AS (VALUES
    (0, '< 15 м²'), (1, '15–30'), (2, '30–45'), (3, '45–60'), (4, '60–90'),
    (5, '90–150'), (6, '150–300'), (7, '300 м²+')
),
ppsq(ord, bucket) AS (VALUES
    (0, '< 50 тыс.'), (1, '50–100'), (2, '100–150'), (3, '150–200'),
    (4, '200–250'), (5, '250–300'), (6, '300–400'), (7, '400 тыс.+')
),
views(ord, bucket) AS (VALUES
    (0, '< 100'), (1, '100–500'), (2, '500–1 тыс.'), (3, '1–2 тыс.'),
    (4, '2–5 тыс.'), (5, '5–10 тыс.'), (6, '10 тыс.+')
),
prem(ord, bucket) AS (VALUES
    (0, '< 0%'), (1, '0…10%'), (2, '10…25%'), (3, '25…50%'),
    (4, '50…100%'), (5, '100…200%'), (6, '200%+')
)
SELECT 'area' AS kind, area.ord, area.bucket, count(d.object_area) AS lots
FROM area
LEFT JOIN d
       ON d.object_area > 0
      AND width_bucket(
              d.object_area, ARRAY[15, 30, 45, 60, 90, 150, 300]::numeric[]
          ) = area.ord
GROUP BY 1, 2, 3
UNION ALL
SELECT 'price_per_square', ppsq.ord, ppsq.bucket, count(d.price_per_square)
FROM ppsq
LEFT JOIN d
       ON d.price_per_square > 0
      AND width_bucket(
              d.price_per_square,
              ARRAY[50000, 100000, 150000, 200000, 250000, 300000, 400000]::numeric[]
          ) = ppsq.ord
GROUP BY 1, 2, 3
UNION ALL
SELECT 'views', views.ord, views.bucket, count(d.portal_views)
FROM views
LEFT JOIN d
       ON d.portal_views IS NOT NULL
      AND width_bucket(
              d.portal_views::numeric,
              ARRAY[100, 500, 1000, 2000, 5000, 10000]::numeric[]
          ) = views.ord
GROUP BY 1, 2, 3
UNION ALL
SELECT 'premium', prem.ord, prem.bucket, count(d.delta_pct)
FROM prem
LEFT JOIN d
       ON d.delta_pct IS NOT NULL
      AND width_bucket(d.delta_pct, ARRAY[0, 10, 25, 50, 100, 200]::numeric[]) = prem.ord
GROUP BY 1, 2, 3
ORDER BY 1, 2;
