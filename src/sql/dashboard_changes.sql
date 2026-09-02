-- Apartments whose price / discount / reserve / family-mortgage status changed
-- on a given calendar day (:date). One input row per history version, exploded
-- into one output row per kind of change it introduced.
WITH fav AS (
    SELECT new_apart_id FROM favorites
),
h AS (
    SELECT
        nah.new_apart_id,
        nah.version,
        nah.address,
        nah."number",
        nah.updated_at::date AS d,
        NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric AS price_num,
        (
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) AS disc,
        COALESCE(nah.reserve, 0) AS reserve,
        (COALESCE(nah.property, '') ILIKE '%семейн%') AS fam,
        lag(NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric) OVER w AS pprice,
        lag(
            NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric > 0
            AND NULLIF(regexp_replace(COALESCE(nah.price_with_discount, ''), '\D', '', 'g'), '')::numeric
                < NULLIF(regexp_replace(nah.price, '\D', '', 'g'), '')::numeric
        ) OVER w AS pdisc,
        lag(COALESCE(nah.reserve, 0)) OVER w AS preserve,
        lag(COALESCE(nah.property, '') ILIKE '%семейн%') OVER w AS pfam
    FROM new_aparts_history nah
    WHERE NOT CAST(:favorites_only AS boolean)
       OR nah.new_apart_id IN (SELECT new_apart_id FROM fav)
    WINDOW w AS (PARTITION BY nah.new_apart_id ORDER BY nah.version)
),
t AS (
    SELECT * FROM h WHERE d = CAST(:date AS date) AND version > 1
)
SELECT
    t.new_apart_id,
    t.address,
    t."number"                              AS number,
    x.kind,
    x.prev_price,
    x.next_price,
    x.pct
FROM t
CROSS JOIN LATERAL (VALUES
    ('price_drop',
        t.pprice IS NOT NULL AND t.price_num IS NOT NULL AND t.price_num < t.pprice,
        t.pprice, t.price_num,
        round((t.price_num - t.pprice) / NULLIF(t.pprice, 0) * 100, 1)),
    ('price_rise',
        t.pprice IS NOT NULL AND t.price_num IS NOT NULL AND t.price_num > t.pprice,
        t.pprice, t.price_num,
        round((t.price_num - t.pprice) / NULLIF(t.pprice, 0) * 100, 1)),
    ('discount_new',
        t.disc AND NOT COALESCE(t.pdisc, false),
        NULL::numeric, NULL::numeric, NULL::numeric),
    ('discount_gone',
        NOT t.disc AND COALESCE(t.pdisc, false),
        NULL::numeric, NULL::numeric, NULL::numeric),
    ('reserved',
        t.reserve = 1 AND COALESCE(t.preserve, 0) = 0,
        NULL::numeric, NULL::numeric, NULL::numeric),
    ('unreserved',
        t.reserve = 0 AND COALESCE(t.preserve, 0) = 1,
        NULL::numeric, NULL::numeric, NULL::numeric),
    ('family_on',
        t.fam AND NOT COALESCE(t.pfam, false),
        NULL::numeric, NULL::numeric, NULL::numeric),
    ('family_off',
        NOT t.fam AND COALESCE(t.pfam, false),
        NULL::numeric, NULL::numeric, NULL::numeric)
) AS x(kind, matched, prev_price, next_price, pct)
WHERE x.matched
ORDER BY
    CASE x.kind WHEN 'price_drop' THEN 0 WHEN 'price_rise' THEN 1 ELSE 2 END,
    abs(COALESCE(x.next_price - x.prev_price, 0)) DESC,
    t.address;
