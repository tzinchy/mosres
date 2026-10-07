-- Три топа одним запросом: падение начальной цены, наценка на торгах, просмотры.
WITH d AS (
    SELECT
        tl.lot_id,
        tl.name,
        tl.brand,
        tl.model,
        tl.year,
        tl.start_price,
        tl.final_price,
        tl.portal_views,
        p.start_price AS prev_start_price,
        CASE WHEN p.start_price > 0
             THEN round((tl.start_price - p.start_price) / p.start_price * 100, 1)
        END AS drop_pct,
        CASE WHEN tl.final_price IS NOT NULL AND tl.start_price > 0
             THEN round((tl.final_price - tl.start_price) / tl.start_price * 100, 1)
        END AS premium_pct
    FROM torgi_lots tl
    LEFT JOIN LATERAL (
        SELECT h.start_price
        FROM torgi_lots_history h
        WHERE h.lot_id = tl.lot_id AND h."version" < tl."version"
        ORDER BY h."version" DESC
        LIMIT 1
    ) p ON true
),
drops AS (
    SELECT lot_id, name, brand, model, year, start_price, prev_start_price,
           final_price, drop_pct AS delta_pct, portal_views
    FROM d WHERE drop_pct < 0 ORDER BY drop_pct LIMIT 10
),
premiums AS (
    SELECT lot_id, name, brand, model, year, start_price, prev_start_price,
           final_price, premium_pct AS delta_pct, portal_views
    FROM d WHERE premium_pct > 0 ORDER BY premium_pct DESC LIMIT 10
),
views AS (
    SELECT lot_id, name, brand, model, year, start_price, prev_start_price,
           final_price, premium_pct AS delta_pct, portal_views
    FROM d WHERE portal_views IS NOT NULL ORDER BY portal_views DESC LIMIT 10
)
SELECT 'top_drop' AS kind, * FROM drops
UNION ALL SELECT 'top_premium', * FROM premiums
UNION ALL SELECT 'top_views', * FROM views;
