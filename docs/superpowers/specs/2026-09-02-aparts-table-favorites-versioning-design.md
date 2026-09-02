# Дизайн: таблица квартир, избранное, графики по дому, починка версионности

Дата: 2026-09-02
Статус: утверждён, ожидает ревью

## Контекст

`mosres` — сбор и версионирование данных о жилье программы реновации с москварталы.рф.
Backend: FastAPI + Postgres + SQLAlchemy(async) + Alembic + alembic-utils. История версий —
триггеры `new_aparts_history_trigger` / `buildings_history_trigger` + upsert из temp-таблиц
с `EXCEPT`-дедупом. Фронтенда нет.

### Проблемы на текущий момент

1. **Версионность шумит.** `EXCEPT`-дедуп в `upsert_with_except_from_temp_table` не отсекает
   неизменённые строки надёжно → триггер `BEFORE INSERT OR UPDATE` пишет строку в `*_history`
   и инкрементит `version` на каждом прогоне `update_all_data`, даже когда данные не менялись.
2. **Сервисный слой сломан после рефактора** (ветка `main`, коммит `bb48528` + рабочая копия):
   - методы `MosResService` (`get_new_aparts_history`, `get_buildings_history`,
     `get_buildings_table`, `get_new_aparts_table`, `get_buildings_apartments`) объявлены без `self`;
   - `api.get_new_aparts` не делает `return`;
   - `service.get_new_aparts_table` вызывает `get_new_aparts_history` с опечаткой kwarg `new_apartd_ids`;
   - `repository.get_new_aparts_table`: `stmt.where(...)` без присваивания — фильтр не применяется;
   - `src/sql/buildings_history_trigger.sql` (сырой файл) вставляет столбцы дома в `new_aparts_history` —
     нерабочий; актуальная логика в `pg_definitions.py` (миграция `e68a81f738f4`).

## Цели

- Починить версионность: история и `version` меняются **только при реальном изменении** смысловых полей.
- Починить сломанный сервисный/API слой.
- Избранное для квартир (single-user, без авторизации, хранение в Postgres).
- Таблица квартир (приоритет) с: прямой ссылкой на москварталы.рф рядом со строкой;
  падением цены (vs прошлая версия и vs исторический максимум); индикаторами скидки
  (есть сейчас / появилась в последней версии).
- Экран дома: график динамики средней цены за м² по датам + история дома.
- Автообновление данных по расписанию (нужно для накопления истории цен).

Не в объёме: авторизация/мультипользовательность, мобильное приложение, деплой-пайплайн,
уведомления.

## Архитектура

```
frontend/ (Vite + React + TS + Tailwind + shadcn/ui)   <-- новый отдельный сервис
        |  HTTP (VITE_API_URL), CORS уже открыт
        v
src/api.py (FastAPI)
        |
src/service.py (MosResService)  -->  src/repository.py  -->  Postgres
                                                              |- new_aparts (+ trigger -> new_aparts_history)
                                                              |- buildings  (+ trigger -> buildings_history)
                                                              |- favorites                (новая)
                                                              |- building_price_stats     (новая)
src/scheduler.py (APScheduler AsyncIOScheduler)  -- daily --> MosResService.refresh_all()
```

### Юниты и границы

| Юнит | Задача | Зависит от |
|---|---|---|
| `pg_definitions.py` (правка) | trigger-функции с гардом `IS DISTINCT FROM` | — |
| `alembic/versions/<new>` | заменить trigger-функции, создать `favorites`, `building_price_stats` | pg_definitions, models |
| `src/models.py` (правка) | `Favorite`, `BuildingPriceStat` | Base |
| `src/repository.py` (правка + доб.) | запросы: aparts-таблица (агрег. SQL), favorites CRUD, price-dynamics, чинёные history/table | модели |
| `src/service.py` (правка) | восстановить `self`, привязать к чинёным repo-функциям, `refresh_all()` | repository |
| `src/scheduler.py` (новый) | daily job → `refresh_all()` | service |
| `src/api.py` (правка) | эндпоинты (см. ниже), `lifespan` со стартом шедулера | service |
| `src/schemas.py` (правка) | response-модели для aparts-таблицы, price-dynamics, favorites | — |
| `frontend/` (новый) | SPA: таблица квартир, экран дома | API |

## Починка версионности

### Trigger-гард

В `pg_definitions.py` обе функции (`insert_new_aparts_history()`, `insert_buildings_history()`):

```plpgsql
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(<смысловые столбцы OLD>) IS NOT DISTINCT FROM ROW(<смысловые столбцы NEW>) THEN
            RETURN NEW;                       -- изменений нет: не пишем историю, version не трогаем
        END IF;
    END IF;
    NEW."version" := COALESCE(OLD."version", 0) + 1;   -- на INSERT OLD.version = NULL -> 1
    INSERT INTO <..._history> (...) VALUES (... NEW.* ...);
    RETURN NEW;
END;
$function$
```

Смысловые столбцы:
- `new_aparts`: `address, building, building_id, building_code, number, rooms, floor, block, area,
  price, price_m, type, term_of_application, open_sale, reserve, y2_sell, for_sell, num_on_floor,
  property, advants, article, price_with_discount, percentage_discount, auction, block_name`
  (исключены: `created_at, updated_at, notes, version`).
- `buildings`: `address, code, district, latitude, longitude, status_code, finishing_code, metro,
  metro_car, metro_walk, floors, flats, vvod, anons_texts, family_hypotec, county`
  (исключены: `created_at, updated_at, notes, version`).

`ROW(...) IS NOT DISTINCT FROM ROW(...)` корректно обрабатывает NULL и массивы.

Новая alembic-миграция: `op.replace_entity` для обеих функций (alembic-utils), триггеры не трогаем.
`EXCEPT`-дедуп в `utils.py` оставляем как есть — он снижает число UPDATE, но больше не влияет на
корректность истории.

### Сервисный слой

- Вернуть `self` всем методам `MosResService`, вызвать корректные repo-функции с корректными kwargs.
- `api.get_new_aparts` (переименовать в `/aparts`) → `return` результата.
- `repository.get_new_aparts_table`: `stmt = stmt.where(...)`.
- Удалить/исправить сырой `src/sql/buildings_history_trigger.sql` (привести к содержимому
  `pg_definitions.py`) — чтобы файл не вводил в заблуждение. Раннтайм его не использует.

## Новые таблицы

### `favorites`

```
new_apart_id  BIGINT PRIMARY KEY   -- FK на new_aparts.new_apart_id, ON DELETE CASCADE
created_at    timestamptz NOT NULL DEFAULT now()
```

### `building_price_stats`

Append-only, срез на дату прогона.

```
id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
building_id    INT NOT NULL
snapshot_date  date NOT NULL DEFAULT now()::date
avg_price_m    numeric
min_price_m    numeric
median_price_m numeric
apart_count    int NOT NULL
UNIQUE (building_id, snapshot_date)   -- повторный прогон за день перезаписывает (upsert)
```

Заполнение (в `refresh_all()` после `update_all_data`):

```sql
INSERT INTO building_price_stats (building_id, snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count)
SELECT
    (na.building_id)::int,
    now()::date,
    avg(price_m_num), min(price_m_num), percentile_cont(0.5) WITHIN GROUP (ORDER BY price_m_num),
    count(*)
FROM (
    SELECT building_id, NULLIF(regexp_replace(price_m, '\D', '', 'g'), '')::numeric AS price_m_num
    FROM new_aparts
) na
WHERE na.price_m_num IS NOT NULL
GROUP BY na.building_id
ON CONFLICT (building_id, snapshot_date) DO UPDATE SET
    avg_price_m = EXCLUDED.avg_price_m, min_price_m = EXCLUDED.min_price_m,
    median_price_m = EXCLUDED.median_price_m, apart_count = EXCLUDED.apart_count;
```

`regexp_replace(..., '\D', '', 'g')` — наивная очистка строки цены до цифр. Если в данных
появятся диапазоны / «от N», добавить парсер отдельно.

## Шедулер

`src/scheduler.py`: `AsyncIOScheduler`, один job `CronTrigger(hour=4, minute=0)` (ежедневно),
`misfire_grace_time` большой, `coalesce=True`, `max_instances=1`. Вызывает
`MosResService().refresh_all()`. Старт/остановка в `api.py` через `@asynccontextmanager lifespan`.
Зависимость: `apscheduler` в `pyproject.toml`.

`refresh_all()`:
```python
async def refresh_all(self):
    await self.update_all_data()
    async with Session() as s, s.begin():
        await refresh_building_price_stats(session=s)
```

## API

Базовый URL без изменений. Все ответы — Pydantic-схемы.

### `GET /aparts`

Query-параметры (все опциональные): `building_id: int`, `favorites_only: bool`,
`discount_only: bool`, `price_drop_only: bool`, `q: str` (поиск по адресу/дому/номеру).

Ответ: список объектов `ApartRow`:

| поле | источник |
|---|---|
| `new_apart_id, address, building, building_id, number, rooms, floor, area` | `new_aparts` |
| `price` | `new_aparts.price` (число) |
| `price_prev` | цена в версии `version - 1` из `new_aparts_history` (NULL если одна версия) |
| `price_delta_prev` | `price - price_prev` |
| `price_delta_prev_pct` | `round((price - price_prev) / price_prev * 100, 1)` |
| `price_max` | `max(price)` по всем версиям в `new_aparts_history` |
| `price_delta_max_pct` | `round((price - price_max) / price_max * 100, 1)` (≤ 0) |
| `has_discount` | `price_with_discount` не пуст |
| `discount_is_new` | `has_discount` сейчас и НЕ было в версии `version - 1` |
| `discount_pct` | `percentage_discount` (число) |
| `is_favorite` | `new_apart_id IN favorites` |
| `mosres_url` | `concat('https://xn--80aae5aibotfo5h.xn--p1ai/obekty/', building_code, '/?flat_id=', new_apart_id)` |
| `updated_at` | `new_aparts.updated_at` |

Реализация — один SQL: `new_aparts` LEFT JOIN LATERAL агрегаты по `new_aparts_history`
(`price` строки приводится `NULLIF(regexp_replace(price,'\D','','g'),'')::numeric`).
Фильтры применяются во внешнем `WHERE` / `HAVING`. `price_drop_only` → `price_delta_prev < 0`.

### `GET /aparts/{new_apart_id}/versions`

История квартиры из `new_aparts_history` по возрастанию `version`. (Чинёный существующий.)

### `POST /favorites/{new_apart_id}` / `DELETE /favorites/{new_apart_id}`

Добавить / убрать из избранного. `POST` — идемпотентный (`ON CONFLICT DO NOTHING`).
Ответ: `{ "new_apart_id": int, "is_favorite": bool }`.

### `GET /favorites`

Список `new_apart_id` в избранном (для гидрации фронта, если понадобится отдельно;
основная таблица уже отдаёт `is_favorite`).

### `GET /buildings`

Список домов из `buildings`. (Чинёный существующий.)

### `GET /buildings/{building_id}/price-dynamics`

Ряд из `building_price_stats` по `building_id`, сортировка по `snapshot_date`.
Ответ: `[{ snapshot_date, avg_price_m, min_price_m, median_price_m, apart_count }]`.

### `GET /buildings/{building_id}/versions`

История дома из `buildings_history`. (Чинёный существующий.)

### `GET /update_data` (существующий)

Ручной триггер `refresh_all()` (расширить: сейчас зовёт только `update_all_data`).
Используется кнопкой «Обновить данные» на фронте.

## Frontend

Каталог `frontend/`, отдельный сервис (свой `package.json`, dev-сервер Vite, деплой отдельным
контейнером). CORS в `api.py` уже `allow_origins=["*"]`.

### Стек

- Vite + React + TypeScript
- Tailwind + shadcn/ui (компоненты: table, button, badge, checkbox, input, card, tabs, select,
  tooltip, sonner)
- TanStack Table — сортировка, клиентская фильтрация, пагинация
- TanStack Query — запросы, кэш, инвалидация после тоглов/обновления
- Recharts — график (идёт в связке с shadcn charts)
- React Router — 2 маршрута
- `VITE_API_URL` — базовый URL API

### Экран 1 — `/` таблица квартир (приоритет)

Колонки:
1. ★ — тогл избранного (иконка-кнопка, оптимистичный апдейт через TanStack Query)
2. Адрес
3. Дом (ссылка на `/buildings/:id`)
4. № · Комнат · Этаж · Площадь
5. Цена
6. Δ vs прошлая — `price_delta_prev` ₽ и `price_delta_prev_pct` %, красный при <0, зелёный при >0, «—» если нет прошлой
7. Δ vs макс — `price_delta_max_pct` %, красный
8. Скидка — бейдж `−X%` (`has_discount`) + бейдж `NEW` (`discount_is_new`)
9. Ссылка — иконка внешней ссылки → `mosres_url` в новой вкладке (рядом со строкой)
10. Обновлено — `updated_at`

Тулбар: `Input` поиск (debounce → `q`), `Checkbox` «только избранное» / «со скидкой» /
«с падением цены», `Select` по дому, `Button` «Обновить данные» (→ `GET /update_data`,
затем инвалидация; toast через sonner).

Строка с `price_delta_prev < 0` — лёгкая подсветка фона.

### Экран 2 — `/buildings/:id` дом

- `Card` с шапкой: адрес, статус, отделка, метро, срок ввода (из `/buildings` или отдельного
  `/buildings/{id}`).
- График Recharts (line/area): X — `snapshot_date`, Y — цена за м². `Tabs`/`Select` переключают
  метрику: средняя / минимальная / медиана. Данные — `/buildings/{id}/price-dynamics`.
- Ниже — та же таблица квартир, отфильтрованная `building_id` (переиспользуемый компонент).
- Опционально — вкладка «История дома» (`/buildings/{id}/versions`).

### Дизайн

Визуальная проработка (палитра, типографика, плотность таблицы, состояния) — отдельным проходом
через `frontend-design` / `ui-ux-pro-max` на этапе реализации фронта. Спек фиксирует структуру
и данные, не финальный вид.

## Порядок реализации

1. **Версионность + сервис.** Trigger-гард в `pg_definitions.py`, alembic-миграция
   (`replace_entity` функций). Починка `MosResService` (`self`), `repository`, `api`.
   Синхронизировать сырой SQL-файл. Проверка: два прогона `update_data` подряд без изменений
   данных → 0 новых строк в `new_aparts_history`, `version` не растёт; изменение цены руками в
   БД → +1 строка, `version +1`.
2. **Новые таблицы + шедулер.** Модели `Favorite`, `BuildingPriceStat`; миграция; `refresh_all()`,
   `refresh_building_price_stats()`; `src/scheduler.py`; `lifespan` в `api.py`; `apscheduler` в
   зависимостях. Проверка: старт приложения регистрирует job; ручной вызов `refresh_all()`
   пишет строки в `building_price_stats`.
3. **Backend-эндпоинты.** Агрегирующий SQL `/aparts` + фильтры; `/favorites` тоглы;
   `/buildings/{id}/price-dynamics`; схемы ответов. Проверка: pytest на SQL-агрегаты
   (фикстура с 2–3 версиями квартиры → корректные `price_prev`, `price_max`, `discount_is_new`).
4. **Frontend scaffold + таблица.** Vite+React+TS, Tailwind, shadcn init, роутинг, TanStack
   Query/Table, экран `/` со всеми колонками и фильтрами, тогл избранного, кнопка обновления.
5. **Frontend экран дома.** `/buildings/:id`, график Recharts с переключателем метрики,
   переиспользование таблицы, шапка дома.

## Тестирование

- **Версионность:** pytest — вставка строки в `new_aparts` дважды с одинаковыми данными → одна
  запись истории; с разной ценой → две, `version` 1→2.
- **Агрегаты `/aparts`:** pytest — фикстура `new_aparts` + `new_aparts_history` (3 версии,
  скидка появляется в v3) → проверка всех вычисляемых полей.
- **Favorites:** pytest — POST дважды идемпотентно, DELETE убирает, `/aparts` отражает
  `is_favorite`.
- **price-dynamics:** pytest — две даты в `building_price_stats` → ряд из 2 точек по возрастанию.
- **Frontend:** без формального фреймворка (не запрошено); ручная проверка сценариев
  тогла/фильтров/графика.

## Открытые допущения

- Строка цены (`price`, `price_m`) — чистое число после `coerce_numbers_to_str`. Наивный
  `regexp_replace('\D','')`. Если появятся диапазоны — отдельный парсер.
- `discount_is_new` смотрит только на предыдущую версию, не на всю историю.
- Шедулер в одном инстансе приложения. Для нескольких реплик — вынести в отдельный worker
  или взять `apscheduler` с job-store в БД (позже, не сейчас).
- `building_id` в `new_aparts` — строка; кастуется к int при join с `buildings`.
