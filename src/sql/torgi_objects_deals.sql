-- Живые лоты, у которых начальная цена за м² ниже того, за что такие лоты
-- реально уходили на торгах. Ориентир — медиана итоговой цены за м² по
-- завершённым продажам того же типа и «уровня» (подвал/цоколь отдельно от
-- надземных: цена за м² у них вдвое ниже): в том же доме, если там набралось
-- хотя бы 3 продажи, иначе в районе или округе — хотя бы 8. Ожидаемая наценка —
-- медиана наценки итога над начальной ценой в том же сегменте (не ниже нуля).
-- Это цена клиринга торгов, не рыночная цена перепродажи, а скидка — не прибыль:
-- в данных портала нет цен перепродажи, их надо сверять с объявлениями.
WITH fin AS (
    SELECT
        o.object_type_name,
        COALESCE(o.short_address ~* '(подвал|цоколь|этаж\s*№?\s*-)', false) AS below,
        o.unom,
        NULLIF(o.region_name, '')                                         AS region_name,
        NULLIF(o.district_name, '')                                       AS district_name,
        o.final_price / o.object_area                                     AS final_ppm,
        o.final_price / o.start_price - 1                                 AS premium
    FROM torgi_objects o
    WHERE o.tender_type_code = 'nsi:tender_type_portal:13'
      AND o.status_text IN ('Признаны состоявшимися', 'Единственный участник')
      AND o.final_price > 0
      AND o.start_price > 0
      AND o.object_area > 0
),
by_house AS (
    SELECT object_type_name, below, unom, count(*) AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY final_ppm)   AS ppm,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY premium)     AS premium
    FROM fin WHERE unom IS NOT NULL
    GROUP BY 1, 2, 3 HAVING count(*) >= 3
),
by_district AS (
    SELECT object_type_name, below, district_name, count(*) AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY final_ppm)   AS ppm,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY premium)     AS premium
    FROM fin WHERE district_name IS NOT NULL
    GROUP BY 1, 2, 3 HAVING count(*) >= 8
),
by_region AS (
    SELECT object_type_name, below, region_name, count(*) AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY final_ppm)   AS ppm,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY premium)     AS premium
    FROM fin WHERE region_name IS NOT NULL
    GROUP BY 1, 2, 3 HAVING count(*) >= 8
),
deals AS (
    SELECT
        l.lot_id,
        l.object_type_name,
        l.short_address,
        l.region_name,
        l.district_name,
        l.object_area,
        l.start_price,
        l.start_price / l.object_area                                     AS start_ppm,
        COALESCE(h.ppm, d.ppm, r.ppm)                                     AS bench_ppm,
        CASE WHEN h.ppm IS NOT NULL THEN 'house'
             WHEN d.ppm IS NOT NULL THEN 'district'
             ELSE 'region' END                                            AS bench_level,
        COALESCE(h.n, d.n, r.n)                                           AS bench_n,
        GREATEST(COALESCE(h.premium, d.premium, r.premium), 0)            AS exp_premium,
        l.deposit,
        l.request_end_date,
        l.tender_date,
        l.portal_views
    FROM torgi_objects l
    CROSS JOIN LATERAL (
        SELECT COALESCE(l.short_address ~* '(подвал|цоколь|этаж\s*№?\s*-)', false) AS below
    ) lv
    LEFT JOIN by_house h
           ON h.object_type_name = l.object_type_name AND h.below = lv.below
          AND h.unom = l.unom
    LEFT JOIN by_district d
           ON d.object_type_name = l.object_type_name AND d.below = lv.below
          AND d.district_name = NULLIF(l.district_name, '')
    LEFT JOIN by_region r
           ON r.object_type_name = l.object_type_name AND r.below = lv.below
          AND r.region_name = NULLIF(l.region_name, '')
    WHERE l.tender_type_code = 'nsi:tender_type_portal:13'
      AND l.request_end_date > now()
      AND (l.status_text IS NULL OR l.status_text = 'Прием заявок')
      AND l.start_price > 0
      AND l.object_area > 0
)
-- не больше 25 лучших на каждый тип и уровень ориентира: иначе общий топ
-- целиком занят грубыми ориентирами по округу и надёжные лоты в него не попадают
SELECT * FROM (
    SELECT
        lot_id, object_type_name, short_address, region_name, district_name,
        object_area, start_price,
        round(start_ppm)                                                  AS start_ppm,
        round(bench_ppm::numeric)                                         AS bench_ppm,
        bench_level, bench_n,
        round((1 - start_ppm / bench_ppm)::numeric, 3)                    AS discount,
        round(start_price * (1 + exp_premium))                            AS est_final_price,
        deposit, request_end_date, tender_date, portal_views,
        row_number() OVER (
            PARTITION BY object_type_name, bench_level
            ORDER BY start_ppm / bench_ppm
        )                                                                 AS rank
    FROM deals
    WHERE bench_ppm IS NOT NULL
      AND start_ppm < bench_ppm * 0.95
      AND start_ppm > bench_ppm * 0.1
) ranked
WHERE rank <= 25
ORDER BY discount DESC
