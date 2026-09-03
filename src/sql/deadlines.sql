-- How many apartments have their application deadline (term_of_application) on
-- each date — the "sale waves". After the date the round closes.
SELECT
    to_date(na.term_of_application, 'DD.MM.YYYY') AS date,
    (to_date(na.term_of_application, 'DD.MM.YYYY') - CURRENT_DATE) AS days_left,
    count(*) AS count
FROM new_aparts na
WHERE na.term_of_application ~ '^\d{2}\.\d{2}\.\d{4}$'
  AND (
        NOT CAST(:favorites_only AS boolean)
        OR na.new_apart_id IN (SELECT new_apart_id FROM favorites)
      )
GROUP BY 1, 2
ORDER BY 1;
