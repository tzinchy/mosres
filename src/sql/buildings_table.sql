SELECT
    b.building_id,
    b.address,
    b.code,
    b.status_code,
    CASE b.status_code
        WHEN 'PROCESSING' THEN 'Строится'
        WHEN 'FINISHED'   THEN 'Введён в эксплуатацию'
        ELSE b.status_code
    END AS status_label,
    b.finishing_code,
    CASE b.finishing_code
        WHEN 'FULL' THEN 'С отделкой'
        WHEN 'NO'   THEN 'Без отделки'
        WHEN 'STD'  THEN 'Отделка по стандарту реновации'
        ELSE b.finishing_code
    END AS finishing_label,
    b.floors,
    b.flats,
    b.vvod,
    b.family_hypotec,
    b.latitude,
    b.longitude,
    b.anons_texts,
    CASE
        WHEN b.img ~ '^/' THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || b.img
        WHEN COALESCE(b.img, '') <> '' THEN b.img
    END AS img_url,
    COALESCE((
        SELECT array_agg(
            CASE WHEN g ~ '^/' THEN 'https://xn--80aae5aibotfo5h.xn--p1ai' || g ELSE g END
        )
        FROM unnest(b.gallery) AS g
    ), ARRAY[]::text[]) AS gallery_urls,
    COALESCE(mm.stops, '[]'::jsonb) AS metro,
    COALESCE(ff.cnt, 0) AS favorites_count
FROM buildings b
LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM favorites f
    JOIN new_aparts na2 ON na2.new_apart_id = f.new_apart_id
    WHERE na2.building_id ~ '^\d+$' AND (na2.building_id)::int = b.building_id
) ff ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', COALESCE(m.name, mid.id),
            'color', m.color,
            'car', b.metro_car[mid.ord],
            'walk', b.metro_walk[mid.ord]
        )
        ORDER BY mid.ord
    ) AS stops
    FROM unnest(b.metro) WITH ORDINALITY AS mid(id, ord)
    LEFT JOIN metros m ON m.metro_id = (CASE WHEN mid.id ~ '^\d+$' THEN mid.id::int END)
) mm ON true
ORDER BY b.address;
