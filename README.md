# mosres

Сервис для сбора, хранения и отслеживания изменений данных о жилой недвижимости программы реновации Москвы с сайта [москварталы.рф](https://xn--80aae5aibotfo5h.xn--p1ai/).

Сохраняет историю изменений по каждому объекту и корпусу — можно отслеживать динамику цен, статусов и доступности квартир.

Второй источник — [torgi.mos.ru](https://torgi.mos.ru/transport/prodazha/transportnye-sredstva/): транспортные лоты города (раздел `/torgi` в API). Для них ведётся та же история версий — видно смену статуса торгов, изменение начальной цены и итоговую цену продажи.

Третий источник — недвижимость и имущество с того же torgi.mos.ru (раздел `/torgi/objects`): квартиры, комнаты, машино-места, нежилые помещения, здания, земельные участки, территории, акции/доли — 28 типов объектов, около 53 тыс. лотов. История версий та же.

---


## Авторизация

Все эндпоинты, кроме `/auth/login` и `/docs`, требуют заголовок
`Authorization: Bearer <token>`. Токен выдаёт `POST /auth/login`
(`{"username": ..., "password": ...}`), живёт `TOKEN_TTL_HOURS` (по умолчанию 30
дней) и подписан `SECRET_KEY` из `.env` — смена ключа разлогинивает всех.

Зарегистрироваться можно прямо в веб-интерфейсе — на странице входа есть
вкладка «Регистрация» (`POST /auth/register`, логин от 3 символов, пароль от 6,
занятый логин даёт 409). Регистрация открытая: кто дошёл до порта, тот и завёл
учётку — если контур публичный, закрывайте сервис на уровне сети.

Пользователь по умолчанию (`DEFAULT_USER`/`DEFAULT_PASSWORD`, по умолчанию
`admin`/`admin`) создаётся контейнером при старте. Остальные — из командной
строки:

```bash
uv run python -m src.users add <логин> <пароль>
uv run python -m src.users passwd <логин> <новый пароль>
uv run python -m src.users list
uv run python -m src.users ensure [<логин> <пароль>]   # создать, если нет (идемпотентно)
```

Избранное у каждого пользователя своё; комментарии видны всем, но удалить можно
только свой.

## Стек

| Слой | Технология |
|---|---|
| API | FastAPI |
| База данных | PostgreSQL 16 |
| ORM / миграции | SQLAlchemy (async) + Alembic + alembic-utils |
| HTTP-клиент | aiohttp + aiohttp-retry |
| Валидация | Pydantic v2 |
| Выгрузка | polars + xlsxwriter |
| Пакетный менеджер | uv |
| Контейнеризация | Docker Compose |

---

## Быстрый старт (Docker Compose)

Нужен только Docker (движок + compose v2). Postgres поднимается тем же compose.

```bash
cp .env.example .env     # можно не править — значения по умолчанию рабочие
make all                 # docker compose up -d --build
```

Всё остальное контейнер делает сам при каждом старте:

1. ждёт готовности БД (healthcheck `pg_isready`);
2. накатывает миграции — `alembic upgrade head`;
3. заводит пользователя по умолчанию, если такого логина ещё нет —
   `python -m src.users ensure`;
4. запускает uvicorn.

Шаги идемпотентны, поэтому `make all` после `git pull` — единственное, что нужно
для обновления: образы пересобираются, схема догоняется сама. Если миграция
упала, контейнер падает вместе с ней (а не отдаёт API на старой схеме) — смотреть
`make logs`.

**Вход по умолчанию:** `admin` / `admin` (переопределяется `DEFAULT_USER` и
`DEFAULT_PASSWORD` в `.env` **до** первого запуска). Пароль уже существующего
пользователя `ensure` не трогает — менять через
`uv run python -m src.users passwd admin <новый пароль>`.
Смените дефолтный пароль, если сервис доступен не только с localhost.

| Сервис | URL | Порт |
|---|---|---|
| Frontend | http://localhost:8080 | `WEB_PORT`, по умолчанию `8080` |
| API | http://127.0.0.1:5433/docs | `5433`, только loopback |
| Postgres | `localhost:5434` | `5434` (внутри сети — `db:5432`) |

Команды: `make all` / `make down` / `make logs` / `make ps` / `make rebuild`.

Фронт собирается с `VITE_API_URL` (build arg, по умолчанию `/api` — nginx
проксирует на `api:5433`); переопределить — `VITE_API_URL=... make all`.

Внешняя БД вместо контейнерной: убрать блок `environment: DB:` у сервиса `api`
в `docker-compose.yaml` и задать `DB` в `.env` (для базы на этой же машине хост —
`host.docker.internal`).

Гипервизор, платформенные особенности (macOS / Windows+WSL2 / Linux) и разбор
типовых ошибок — **[docs/deploy.md](docs/deploy.md)**.

---

## Запуск без контейнеров

Здесь миграции и пользователь — руками (автоматика живёт в контейнере):

```bash
uv sync
cp .env.example .env                         # DB должен смотреть на живой Postgres
uv run alembic upgrade head                  # = make upgrade
uv run python -m src.users ensure            # admin/admin из .env, если его ещё нет
uv run uvicorn src.api:app --reload          # API на :8000
cd frontend && npm install && npm run dev    # фронт на :5173
```

---

## API

### Данные

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/update_data` | Забрать свежие данные с москварталы.рф, сохранить в БД и пересчитать `building_price_stats` (`refresh_all`) |
| `GET` | `/file` | Скачать Excel-файл со всеми данными на текущую дату |

### Квартиры

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/aparts` | Таблица квартир: `price`, `price_m`, `price_prev/delta`, `price_max/delta`, `has_discount`, `discount_is_new`, `discount_pct`, `reserve`, `is_family`, `type_label`, `plan_url`, `tour_3d_url`, `metro[{name,color,car,walk}]`, `family_hypotec`, `deal_score`, `is_favorite`, `mosres_url`. Query: `building_id`, `building_ids` (CSV), `favorites_only`, `discount_only`, `price_drop_only`, `reserved_only`, `family_only`, `q` |
| `GET` | `/aparts/{new_apart_id}/versions` | История изменений конкретной квартиры |
| `GET` | `/file` | Выгрузка таблицы квартир в Excel. Query: `favorites_only`, `building_id` |
| `GET` | `/dashboard` | Метрики: всего/избранное/дома, сумма стоимости, средняя цена и цена м², резерв/скидки/семейная, и за сегодня — новые/изменения/падения/рост/скидки/резерв + средняя динамика. Query: `favorites_only` |
| `GET` | `/dashboard/timeseries` | По дням за `days` (по умолч. 30): новые, изменения, падения, рост, новые скидки, ушли в резерв, средняя динамика %. Query: `favorites_only`, `days` |
| `GET` | `/buildings/stats` | По домам: квартир, средняя/мин цена, цена м², резерв, скидки, семейная, новых за неделю, в избранном |
| `GET` | `/status` | Время последнего обновления данных + интервал планировщика |

### Транспорт (torgi.mos.ru)

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/torgi/lots` | Таблица лотов: `status_text`, `is_open`, `transport_category`, `brand`, `model`, `year`, `plate`, `vin`, `pts`, `mileage`, `power`, `engine_volume`, `start_price`, `deposit`, `auction_step`, `final_price`, `start_price_prev/delta_pct`, `final_price_delta_pct`, `days_left`, `photos`, `platform_link`, `torgi_url`. Query: `open_only`, `status`, `category`, `brand`, `year_min`, `year_max`, `min_price`, `max_price`, `max_mileage`, `price_drop_only`, `with_plate_only`, `q` (имя/марка/модель/госномер/VIN) |
| `GET` | `/torgi/lots/{lot_id}` | Один лот |
| `GET` | `/torgi/lots/{lot_id}/versions` | История изменений лота (`torgi_lots_history`) |
| `GET` | `/torgi/invest` | Где торги по транспорту окупаются: `segments` — «категория × возраст» (доля состоявшихся, медиана итоговой цены, наценка, доля продаж без борьбы), `deals` — живые лоты дешевле типичного итога той же марки или категории и возраста. Формат тот же, что у `/torgi/objects/invest` |
| `GET` | `/torgi/odds` | Шансы живых лотов транспорта по скорости просмотров (формат как у `/torgi/objects/odds`) |
| `GET` | `/torgi/stats` | Сводка по категориям транспорта: лотов, из них в приёме заявок и проданных, средняя/мин цена, средний пробег |
| `GET` | `/torgi/file` | Выгрузка лотов в Excel. Query: `open_only`, `category`, `q` |
| `GET` | `/torgi/update_data` | Забрать свежие лоты с torgi.mos.ru и сохранить в БД |

### Недвижимость и имущество (torgi.mos.ru)

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/torgi/objects` | Таблица лотов: `object_type_name`, `address`, `object_area`, `living_area`, `kitchen_area`, `rooms_count`, `room_floor`, `floors`, `build_year`, `house_type`, `cadastral_number`, `start_price`, `price_per_square`, `final_price`, `start_price_prev/delta_pct`, `final_price_delta_pct`, `days_left`, `is_live`, `metro`, `photos`, `details` (весь objectInfo карточки), `portal_views`. Query: `object_type`, `district`, `region`, `fav_only`, `live_only`, `sold_only`, `price_drop_only`, `min_price`, `max_price`, `min_area`, `max_area`, `rooms`, `q`, `limit` |
| `GET` | `/torgi/objects/{lot_id}` | Один лот |
| `GET` | `/torgi/objects/{lot_id}/versions` | История изменений лота |
| `GET` | `/torgi/objects/{lot_id}/views` | Просмотры карточки по дням (последнее значение за день), копятся триггером с момента миграции `d3a91b5c7e20` |
| `GET` | `/torgi/objects/invest` | Где торги окупаются: `segments` — итоги по «тип × округ» (доля состоявшихся, медиана ₽/м² итога, наценка, доля продаж без борьбы), `deals` — живые лоты с начальной ценой за м² ниже типичного итога похожих (дом → район → округ) |
| `GET` | `/torgi/objects/odds` | Шансы живых лотов (`p_sold` — торги состоятся, `p_competed` — итог выше начальной цены) по скорости просмотров в день: эмпирически по завершённым продажам того же типа, группы — квинтили скорости |
| `GET` | `/torgi/objects/views-series` | Ряды просмотров по дням для набора лотов. Query: `ids` — id через запятую (спарклайны в таблице) |
| `GET` | `/torgi/objects/stats` | Сводка по типам объектов: лотов, актуальных, проданных, средние цена, ₽/м² и площадь |
| `GET` | `/torgi/objects/breakdown` | Разрез по измерению. Query: `dimension` (`region`, `district`, `object_type`, `house_type`, `rooms`), `object_type` |
| `GET` | `/torgi/objects/dashboard` | Composite-сводка: KPI, типы, округа, воронка, ряд по месяцам, сезонность, дедлайны, изменения, гистограммы, топы, заполненность данных, активность версий |
| `GET` | `/torgi/objects/points` | Тонкий массив под карту и scatter. Query: `object_type` |
| `GET` | `/torgi/objects/favorites` | Избранное пользователя (`POST`/`DELETE` на `/torgi/objects/favorites/{lot_id}`) |
| `GET` | `/torgi/objects/update_data` | Прогон вручную. Query: `detail_budget` — сколько карточек прочитать за прогон |

«Актуальный» лот определяется по датам (приём заявок идёт либо торги впереди),
а не по `status_text`: статус приходит только из карточки, а карточки архива
читаются порциями.

#### Номера и паттерны

Госномер лота разбирается при загрузке (`src/plates.py`): `plate_norm` — номер без пробелов
и латинских гомоглифов, `plate_region` — код региона, `plate_valid` — разобрался ли номер в
один из форматов (легковой, такси, прицеп, мото). Колонки версионируются вместе с лотом,
поэтому в истории видно, когда у лота появился или сменился номер.

Паттерны пользователя (`plate_watches`) — либо маска, либо готовый пресет из `PRESETS`
(три одинаковые цифры, зеркальные, малые 001–009, блатные серии). В маске `?` — любая буква
номера, `#` — цифра, `=` — повтор предыдущего символа, `*` — любой остаток: `?#==??*` — это
три одинаковые цифры. Маска компилируется в regex, матчинг идёт в SQL (`plate_norm ~ regex`).

### Избранное

У каждого пользователя своё: таблица `favorites`, ключ `(new_apart_id, user_id)`.

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/favorites` | Список `new_apart_id` в избранном |
| `POST` | `/favorites/{new_apart_id}` | Добавить (идемпотентно) |
| `DELETE` | `/favorites/{new_apart_id}` | Убрать |

### Корпуса

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/buildings` | Список всех корпусов |
| `GET` | `/buildings/{building_id}/price-dynamics` | Динамика цены за м² по датам (`building_price_stats`) |
| `GET` | `/buildings/{building_id}/versions` | История изменений конкретного корпуса |

---

## Планировщик

APScheduler (`AsyncIOScheduler`) запускает `refresh_all()` каждые `REFRESH_INTERVAL_MINUTES`
(по умолчанию 30). Каждый прогон пишет строку в `refresh_runs`; `/status` отдаёт время последнего.
Старт/остановка — в `lifespan` FastAPI.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `SCHEDULER_ENABLED` | `true` | Включить планировщик при старте приложения |
| `REFRESH_INTERVAL_MINUTES` | `30` | Интервал обновления данных москварталы.рф |
| `TORGI_ENABLED` | `true` | Включить обновление лотов torgi.mos.ru |
| `TORGI_REFRESH_INTERVAL_MINUTES` | `15` | Интервал обновления лотов torgi.mos.ru |
| `TORGI_OBJECTS_ENABLED` | `true` | Включить обновление лотов недвижимости torgi.mos.ru |
| `TORGI_OBJECTS_REFRESH_INTERVAL_MINUTES` | `180` | Интервал обновления лотов недвижимости |
| `TORGI_OBJECTS_DETAIL_BUDGET` | `20000` | Сколько карточек лотов читать за один прогон |

Каждый источник обновляет своя джоба (`periodic-refresh`, `periodic-torgi-refresh`,
`periodic-torgi-objects-refresh`) — падение одного источника не останавливает остальные.

---

## Тесты

```bash
make test          # uv run pytest
```

Backend-тесты гоняются против реального Postgres 16 в **testcontainers** (нужен запущенный Docker).
`tests/conftest.py` поднимает контейнер, применяет `alembic upgrade head`, чистит таблицы между тестами.

---

## Фронтенд

Отдельный сервис в `frontend/` (Vite + React + TypeScript + shadcn/ui). См. `frontend/README.md`.

---

## Источник данных

Данные забираются с API москварталы.рф:

```
https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php
```

Поддерживаемые типы объектов через параметр `type[]`:

| Значение | Тип |
|---|---|
| `R` | Квартиры |
| `NR` | Коммерческие помещения |
| `P` | Паркинг |

По умолчанию сервис собирает только жилую недвижимость (`type[]=R`).

### torgi.mos.ru (транспорт)

Два открытых эндпоинта портала (ни авторизации, ни кук):

```
POST https://api.torgi.mos.ru/investmoscow/tender/v2/filtered-tenders/searchungroupedtenderobjects
GET  https://api.torgi.mos.ru/investmoscow/tender/v1/object-info/gettenderobjectinformation?tenderId=
```

Фильтр — `objectTypes: ["nsi:41:99021071"]` («Транспортное средство»), это
единственный тип объекта портала, под которым лежит транспорт.

Важно: сам сайт показывает только лоты с открытым приёмом заявок (**66**), потому что
подставляет ещё и фильтр `tenderStatus`. Мы его не ставим и получаем **весь архив
(~1600 лотов)** со статусами «Прием заявок», «Прием заявок завершен», «Признаны
состоявшимися/несостоявшимися», «Единственный участник», «Отменены».

Карточка лота (госномер, VIN, ПТС, задаток, шаг аукциона, итоговая цена, статус)
есть только во втором эндпоинте, поэтому она запрашивается — но лишь для новых лотов
и тех, у которых портал сдвинул `updateDate`. На установившемся архиве повторный
прогон не делает ни одного запроса к карточкам.

### torgi.mos.ru (недвижимость и имущество)

Те же два эндпоинта портала, но без фильтра по типу объекта — транспорт
исключается на нашей стороне (у него своя таблица и свой разбор госномеров).

Что важно знать про этот источник:

* портал заявляет `totalCount` около 280 тыс., но пагинация повторяет строки:
  уникальных лотов около **53,5 тыс.**;
* сортировки по дате и фильтра «что изменилось с такого-то числа» у списка нет
  (проверено), поэтому полный проход по списку делается каждый прогон. Он
  дешёвый: 280 запросов по 1000 лотов. Страница читается — страница пишется,
  поэтому память не растёт на весь архив, а прогон видно по строкам в таблице;
* карточки читаются по очереди: сначала актуальные лоты, затем недавно
  отторгованные без итоговой цены, затем архив без карточки — порциями по
  `TORGI_OBJECTS_DETAIL_BUDGET`. Прочитанный архив не перечитывается никогда;
* замер пропускной способности портала: 8 параллельных карточек — 21 запрос/с,
  16 — 38, 32 — 50, 64 — те же 50. Ни на одном уровне не прилетало 429, поэтому
  взято 32;
* дат вида `9999-12-31` портал ставит вместо «даты нет» — они отсекаются при
  загрузке, иначе лот навсегда считался бы актуальным;
* счётчик просмотров портал крутит на каждом обновлении, поэтому в сравнение версий
  он не входит. Триггер истории пропускает update, где изменились только
  просмотры, без новой версии, но обновляет значение и пишет точку в
  `torgi_object_views` (одна на лот и день). Ряд копится с 8 октября 2026: до
  этого значение в `torgi_objects` обновлялось только вместе с другими правками
  лота и могло отставать от портала;
* «скидка к типичному итогу» в `/torgi/objects/invest` — не прибыль: в данных
  портала нет цен перепродажи, ориентиром служат итоги завершённых торгов
  (подвалы и цоколи считаются отдельно, их ₽/м² вдвое ниже);
* разнородные поля карточки (у каждого типа объекта свои) целиком складываются
  в колонку `details` (jsonb), чтобы новый ярлык портала не требовал миграции.

---

## Структура проекта

```
mosres/
├── src/
│   ├── client.py        # HTTP-клиент (москварталы.рф)
│   ├── service.py       # Бизнес-логика (москварталы.рф)
│   ├── torgi.py         # Сбор и чтение лотов torgi.mos.ru (транспорт)
│   ├── torgi_objects.py # Сбор и чтение лотов недвижимости torgi.mos.ru
│   ├── repository.py    # Запросы к БД
│   ├── schemas.py       # Pydantic-схемы
│   ├── models.py        # SQLAlchemy-модели
│   ├── utils.py         # Query builder, утилиты
│   ├── depends.py       # FastAPI dependencies
│   ├── config.py        # Конфигурация
│   └── main.py          # FastAPI app
├── alembic/
│   └── versions/
├── sql/                 # Сырые SQL-запросы
├── docker-compose.yaml
├── pyproject.toml
└── .env.example
```