# Dashboard: конструктор графика (pivot)

**Дата:** 2026-09-03
**Статус:** утверждён

## Идея

Один блок «Свой график»: пользователь выбирает **разрез × показатель × тип** и
видит график. Дополняет фиксированные графики дашборда, не заменяет их.

## API

`GET /dashboard/pivot?dimension=&metric=&favorites_only=&date_from=&date_to=`

- `dimension` ∈ `date | district | rooms | building`
- `metric` ∈ `count | reserved | discounted | family | avg_price | avg_price_m`
- `date_from` / `date_to` — только для `dimension=date` (дефолт: вся история)
- ответ: `list[PivotPoint]` = `{key: str, value: float | None}`
  - `dimension=date` — `key` = ISO-дата, одна точка на день; историческое
    состояние (актуальная версия каждой квартиры на тот день)
  - иначе — текущий срез из `new_aparts`, сгруппировано, топ 40 по количеству
    (фронт пере-сортирует по выбранному показателю)

422 если `dimension` / `metric` не из белого списка.

### SQL

- `src/sql/pivot_date.sql` — как `dashboard_timeseries`, но на каждый день
  считает все показатели (`count/reserved/discounted/family/avg_price/avg_price_m`).
- `src/sql/pivot_category.sql` — шаблон с `{key}` / `{join}`, подставляются из
  белого списка в сервисе (не пользовательский ввод):
  - `district`: `LEFT JOIN buildings b ON b.building_id = na.building_id::int
    LEFT JOIN districts d ON d.district_id = b.county`, key `COALESCE(d.name,'Прочие')`
  - `rooms`: key `CASE WHEN COALESCE(na.rooms,'0') IN ('0','') THEN 'Студия'
    ELSE na.rooms||'-комн' END`
  - `building`: key `COALESCE(na.address, na.building, 'дом '||na.building_id)`
  Возвращает все показатели, сервис берёт `row[metric]`.

`na.building_id` — всегда числовой (проверено), каст безопасен.

### Схемы / роутинг

- `src/schemas.py`: `PivotPoint`
- `src/repository.py`: `get_pivot_date`, `get_pivot_category`
- `src/service.py`: `get_dashboard_pivot` + белые списки `_PIVOT_DIMS`, `_PIVOT_METRICS`
- `src/api.py`: `GET /dashboard/pivot`

## Фронт

- `src/lib/types.ts`: `PivotPoint`, `PivotDimension`, `PivotMetric`
- `src/hooks/useDashboard.ts`: `useDashboardPivot`
- `src/components/PivotChart.tsx` — новый блок:
  - три `<select>`: разрез / показатель / тип (линия | столбцы)
  - тип по умолчанию: `date` → линия, иначе → столбцы; пользователь может сменить
  - `dimension=date` → показывает поля дат from/to (переиспользуем стиль дашборда)
  - `metric` в деньгах (`avg_price`, `avg_price_m`) → форматирование `moneyShort`
  - категориальные разрезы: сортировка по выбранному показателю, топ 15
- `src/pages/DashboardPage.tsx`: секция «Свой график» после «Состояние списка по датам»

## Край

- Пустой ответ / нет данных → заглушка.
- `date_from > date_to` — бэк сам сужает (как в timeseries).
- `building` — тысячи значений → топ по количеству в SQL (LIMIT 40) + топ-15 на фронте.

## Тесты

`tests/test_dashboard_pivot.py`:
- `dimension=rooms&metric=count` — суммы по комнатности сходятся с общим числом
- `dimension=district&metric=avg_price_m` — ключи = названия округов, value > 0
- `dimension=date&metric=reserved` — одна точка на день, значение = число в резерве
- невалидные `dimension`/`metric` → 422

## Вне рамок

- `dimension=metro` (у графика «По метро» уже есть переключатель показателя)
- сохранение выбранной конфигурации, несколько серий на одном графике
