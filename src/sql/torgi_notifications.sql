-- Лента уведомлений по торгам: причина в поле kind.
--   plate_match — первая версия лота, чей номер подошёл под паттерн пользователя
--                 (лот появился, или у лота появился/сменился номер);
--   lot_change  — по избранным лотам: цена, статус, появилась итоговая.
-- Таблицы «уже отправленного» нет — матчинг считается на чтение, поэтому новый
-- паттерн сразу показывает и прошлые попадания.
WITH my AS (
    SELECT id, regex, COALESCE(label, mask) AS mask
    FROM plate_watches
    WHERE user_id = :user_id
),
fav AS (
    SELECT lot_id FROM torgi_favorites WHERE user_id = :user_id
),
h AS (
    SELECT
        tlh.lot_id,
        tlh."version",
        tlh.updated_at,
        tlh.name,
        tlh.plate_norm,
        tlh.status_text,
        tlh.start_price,
        tlh.final_price,
        lag(tlh.start_price) OVER w AS prev_start_price,
        lag(tlh.status_text) OVER w AS prev_status_text,
        lag(tlh.final_price) OVER w AS prev_final_price
    FROM torgi_lots_history tlh
    WINDOW w AS (PARTITION BY tlh.lot_id ORDER BY tlh."version")
),
-- самая ранняя версия лота, на которой номер подошёл хоть под один паттерн
matched AS (
    SELECT DISTINCT ON (h.lot_id) h.*, m.masks
    FROM h
    JOIN LATERAL (
        SELECT array_agg(my.mask ORDER BY my.id) AS masks
        FROM my
        WHERE h.plate_norm ~ my.regex
    ) m ON m.masks IS NOT NULL
    ORDER BY h.lot_id, h."version"
)
SELECT
    'plate_match'                                   AS kind,
    lot_id,
    name,
    plate_norm,
    masks                                           AS matched_masks,
    "version",
    updated_at,
    status_text,
    start_price,
    prev_start_price,
    final_price,
    false                                           AS price_down,
    false                                           AS price_up,
    false                                           AS status_changed,
    false                                           AS sold
FROM matched
WHERE updated_at >= now() - (CAST(:days AS integer) || ' days')::interval
UNION ALL
SELECT
    'lot_change',
    h.lot_id,
    h.name,
    h.plate_norm,
    ARRAY[]::text[],
    h."version",
    h.updated_at,
    h.status_text,
    h.start_price,
    h.prev_start_price,
    h.final_price,
    (h.prev_start_price IS NOT NULL AND h.start_price < h.prev_start_price),
    (h.prev_start_price IS NOT NULL AND h.start_price > h.prev_start_price),
    (h.status_text IS DISTINCT FROM h.prev_status_text),
    (h.final_price IS NOT NULL AND h.prev_final_price IS NULL)
FROM h
WHERE h.lot_id IN (SELECT lot_id FROM fav)
  AND h."version" > 1
  AND h.updated_at >= now() - (CAST(:days AS integer) || ' days')::interval
  AND (
        h.start_price IS DISTINCT FROM h.prev_start_price
        OR h.status_text IS DISTINCT FROM h.prev_status_text
        OR (h.final_price IS NOT NULL AND h.prev_final_price IS NULL)
      )
ORDER BY updated_at DESC, lot_id;
