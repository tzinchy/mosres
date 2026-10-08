-- Три топа одним запросом: падение начальной цены, наценка на торгах, просмотры.
-- В топах цены и наценки лоты со стартом до 10 000 ₽ не участвуют: портал ставит
-- туда 1 ₽ как «цены нет», и наценка выходит миллиарды процентов.
WITH d AS (
    SELECT
        o.lot_id,
        o.name,
        o.object_type_name,
        o.short_address,
        o.object_area,
        o.start_price,
        o.final_price,
        o.price_per_square,
        o.portal_views,
        p.start_price AS prev_start_price,
        CASE WHEN p.start_price > 0
             THEN round((o.start_price - p.start_price) / p.start_price * 100, 1)
        END AS drop_pct,
        CASE WHEN o.final_price IS NOT NULL AND o.start_price > 0
             THEN round((o.final_price - o.start_price) / o.start_price * 100, 1)
        END AS premium_pct
    FROM torgi_objects o
    LEFT JOIN LATERAL (
        SELECT h.start_price
        FROM torgi_objects_history h
        WHERE h.lot_id = o.lot_id AND h."version" < o."version"
        ORDER BY h."version" DESC
        LIMIT 1
    ) p ON true
),
drops AS (
    SELECT lot_id, name, object_type_name, short_address, object_area,
           start_price, prev_start_price, final_price, price_per_square,
           drop_pct AS delta_pct, portal_views
    FROM d WHERE drop_pct < 0 AND prev_start_price >= 10000 ORDER BY drop_pct LIMIT 10
),
premiums AS (
    SELECT lot_id, name, object_type_name, short_address, object_area,
           start_price, prev_start_price, final_price, price_per_square,
           premium_pct AS delta_pct, portal_views
    FROM d WHERE premium_pct > 0 AND start_price >= 10000 ORDER BY premium_pct DESC LIMIT 10
),
views AS (
    SELECT lot_id, name, object_type_name, short_address, object_area,
           start_price, prev_start_price, final_price, price_per_square,
           premium_pct AS delta_pct, portal_views
    FROM d WHERE portal_views IS NOT NULL ORDER BY portal_views DESC LIMIT 10
)
SELECT 'top_drop' AS kind, * FROM drops
UNION ALL SELECT 'top_premium', * FROM premiums
UNION ALL SELECT 'top_views', * FROM views;
