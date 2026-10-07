-- Сколько лотов подходит под каждый пресет номера. Пары (label, regex)
-- приходят массивами из PRESETS (src/plates.py), не из пользовательского ввода.
SELECT p.preset, count(tl.lot_id) AS lots
FROM unnest(CAST(:presets AS text[]), CAST(:regexes AS text[])) AS p(preset, regex)
LEFT JOIN torgi_lots tl ON tl.plate_norm ~ p.regex
GROUP BY p.preset
ORDER BY lots DESC, p.preset;
