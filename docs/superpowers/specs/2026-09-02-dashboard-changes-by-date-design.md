# Dashboard: изменения по квартирам за дату + семейная ипотека на графике

**Дата:** 2026-09-02
**Статус:** утверждён

## Проблема

Нет способа посмотреть, по каким квартирам произошли изменения в конкретный
день (по умолчанию — сегодня): изменилась цена, появилась/снялась скидка,
ушла/вышла из резерва, стала/перестала быть доступной по семейной ипотеке.
График «Динамика изменений» ограничен пресетами 7/30/90/180 дней и не
показывает переход в семейную ипотеку. Плитка «Изменений» считает любую новую
версию, включая служебный перехэш URL картинки-планировки, поэтому завышена.

## Определение «изменения»

Переход между соседними версиями квартиры (`new_aparts_history`, порядок по
`version`), в котором изменилось хотя бы одно из:

| Признак | Источник | Нормализация |
|---|---|---|
| Цена | `price` | `regexp_replace(price,'\D','','g')::numeric` |
| Скидка | `price_with_discount` | флаг «есть скидка» = `pwd > 0 AND pwd < price` |
| Резерв | `reserve` | `COALESCE(reserve,0)` |
| Семейная ипотека | `property` | `COALESCE(property,'') ILIKE '%семейн%'` |

`plan`, `plan_s`, `price_m` и прочее — **не** изменение.

`kind` изменения (одна версия может дать несколько):
`price_drop`, `price_rise`, `discount_new`, `discount_gone`, `reserved`,
`unreserved`, `family_on`, `family_off`.

Дата изменения = `updated_at::date` версии, которая его внесла.

## Бэкенд

### `GET /dashboard/changes`

Параметры:
- `date: date` — по умолчанию `now()::date`. Валидация: `history_from <= date <= now()::date`, иначе 422.
- `favorites_only: bool = false`

Ответ: `list[DashboardChange]`
```
DashboardChange:
  new_apart_id: int
  address: str | None
  number: str | None
  kind: str            # см. выше
  prev: str | None     # человекочитаемо: "16 760 925 ₽" / "нет" / "в резерве"
  next: str | None
  pct: float | None    # только для price_drop/price_rise
```
SQL — новый `src/sql/dashboard_changes.sql`. Одна CTE с `lag()` по всем четырём
признакам за партицией `new_apart_id ORDER BY version`, фильтр
`updated_at::date = :date`, разворот в строки по `kind` через `UNION ALL` или
`LATERAL`. Сортировка: `price_drop`/`price_rise` — по `abs(delta)` убыв.,
остальные — по `address`.

### `GET /dashboard/timeseries` — изменения

- Параметры `days: int` → `date_from: date | None`, `date_to: date | None`.
  Дефолт: `date_from = history_from`, `date_to = now()::date`.
  Валидация: `date_from <= date_to`, оба в `[history_from, now()::date]`.
- Серия `changes` пересчитывается как «реальный переход» (по определению выше),
  а не `count(*) FILTER (WHERE version > 1)`.
- Новая серия `became_family` — версии с `family_on` за день.
- `DashboardPoint`: добавить `became_family: int`. Поле `changes` семантически
  меняется (значение станет меньше — это ожидаемо).

### `GET /status`

`RefreshStatus`: добавить
- `history_from: date | None` — `min(updated_at::date)` из `new_aparts_history`
- `history_to: date | None` — `max(updated_at::date)`

Одним запросом вместе с существующей логикой.

### Затрагиваемые файлы бэка

- `src/sql/dashboard_changes.sql` (новый)
- `src/sql/dashboard_timeseries.sql` (правка: параметры дат, `changes`, `became_family`)
- `src/repository.py` — функции чтения
- `src/service.py` — методы `get_dashboard_changes`, правка `get_dashboard_timeseries`, `get_refresh_status`
- `src/api.py` — маршрут `/dashboard/changes`, правка сигнатуры `/dashboard/timeseries`
- `src/schemas.py` — `DashboardChange`, `DashboardPoint.became_family`, `RefreshStatus.history_from/history_to`

## Фронтенд

Только `DashboardPage` и графики. Тёмной темы нет, палитра графиков нейтральная
(`--chart-*`), уже на месте.

### «Динамика изменений» (`DashboardChart`)

- Вместо кнопок 7/30/90/180 — два `<input type="date">` (`from` / `to`).
  Дефолты: `from = status.history_from`, `to = status.history_to ?? today`.
  Атрибуты `min`/`max` = `[history_from, today]`.
- Новая линия `became_family` — «Стали по семейной», цвет `--chart-5`.
- Хук `useDashboardTimeseries(favOnly, dateFrom, dateTo)`.

### Новая секция «Изменения за <дата>»

- Состояние `date` в `DashboardPage`, синк в URL (`?date=YYYY-MM-DD`), дефолт —
  сегодня. `<input type="date">` с `max = today`, `min = history_from`.
- Хук `useDashboardChanges(date, favOnly)` → `GET /dashboard/changes`.
- Рендер: группы по `kind` в фиксированном порядке
  (Подешевели, Подорожали, Появилась скидка, Снята скидка, Ушли в резерв,
  Вышли из резерва, Стали по семейной, Перестали по семейной). Заголовок группы
  + счётчик, строки: `{address}, кв. {number}` слева, `{prev} → {next}` (+`pct`
  для цены) справа, вся строка — `<Link to="/aparts?...">`.
- Пустой ответ → «За <дата> изменений не было».
- **Заменяет** блок «Сильнее всего подешевели сегодня».

### Плитка «Изменений»

- Значение из нового `m.changed_today` (уже честное после правки определения в
  `dashboard.sql` — привести к тому же определению перехода).
- `to="/dashboard?date=<today>"` и скролл/якорь к секции (или просто фильтр —
  плитка ведёт на дашборд с сегодняшней датой).

### Затрагиваемые файлы фронта

- `src/hooks/useDashboard.ts` — `useDashboardChanges`, правка `useDashboardTimeseries`, тип `RefreshStatus`
- `src/lib/types.ts` — `DashboardChange`, `DashboardPoint.became_family`, `RefreshStatus`
- `src/components/DashboardChart.tsx` — серия `became_family` (переключатель периода уезжает в страницу)
- `src/components/DashboardChanges.tsx` (новый) — секция за дату
- `src/pages/DashboardPage.tsx` — состояние даты + URL-синк, два поля даты для графика, монтаж новой секции, удаление `topMovers`

## Ошибки и край

- Пустая история (свежая БД): `history_from` = null → поля даты disabled,
  секция и график показывают заглушку «История ещё не накопилась».
- `date` вне диапазона: бэк 422, фронт не даёт выбрать (min/max на input).
- Расхождение `changes` до/после: значение графика и плитки станет меньше —
  задокументировано, отдельная миграция данных не требуется (легаси
  version-2-строки от перехэша плана просто перестают считаться).

## Тесты

- `tests/test_dashboard_changes.py` — фикстура: 3 квартиры,
  по одной с price_drop / family_on / reserved + одна версия только со сменой
  `plan`. Проверить: набор `kind`, значения `prev`/`next`/`pct`, и что
  plan-only версия **не** попала в результат.
- Проверка `timeseries`: `became_family` считает `family_on`, `changes` не
  считает plan-only.

## Вне рамок

- Чистка 2132 легаси version-2 строк — опционально, не блокирует фичу.
- Экспорт списка изменений в Excel.
- Изменения по домам (только по квартирам).
