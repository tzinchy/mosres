# mosres

Сервис для сбора, хранения и отслеживания изменений данных о жилой недвижимости программы реновации Москвы с сайта [москварталы.рф](https://xn--80aae5aibotfo5h.xn--p1ai/).

Сохраняет историю изменений по каждому объекту и корпусу — можно отслеживать динамику цен, статусов и доступности квартир.

---


## Авторизация

Все эндпоинты, кроме `/auth/login` и `/docs`, требуют заголовок
`Authorization: Bearer <token>`. Токен выдаёт `POST /auth/login`
(`{"username": ..., "password": ...}`), живёт `TOKEN_TTL_HOURS` (по умолчанию 30
дней) и подписан `SECRET_KEY` из `.env` — смена ключа разлогинивает всех.

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
| Выгрузка | pandas + openpyxl |
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
| `REFRESH_INTERVAL_MINUTES` | `30` | Интервал обновления данных |

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

---

## Структура проекта

```
mosres/
├── src/
│   ├── client.py        # HTTP-клиент (москварталы.рф)
│   ├── service.py       # Бизнес-логика
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