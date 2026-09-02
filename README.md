# mosres

Сервис для сбора, хранения и отслеживания изменений данных о жилой недвижимости программы реновации Москвы с сайта [москварталы.рф](https://xn--80aae5aibotfo5h.xn--p1ai/).

Сохраняет историю изменений по каждому объекту и корпусу — можно отслеживать динамику цен, статусов и доступности квартир.

---

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

База данных **внешняя** — compose поднимает только `api` и `web`.

```bash
cp .env.example .env
# в .env указать DB. Для базы на этой же машине хост — host.docker.internal:
#   DB=postgresql+asyncpg://postgres:password@host.docker.internal:5432/postgres

make upgrade                   # применить миграции к своей БД
make all                       # docker compose up -d --build (пересобирает api и web)
```

`make all` каждый раз пересобирает образы — после `git pull` этого достаточно, чтобы
подтянулись изменения фронта и бэка. Схему обновляет `make upgrade` отдельно.

| Сервис | URL | Порт |
|---|---|---|
| API | http://localhost:5437 (`/docs`) | `5437` |
| Frontend | http://localhost:5173 | `5173` (nginx :80 внутри) |

Команды: `make all` / `make down` / `make logs` / `make ps` / `make rebuild`.

Фронт собирается с `VITE_API_URL` (build arg, по умолчанию `http://localhost:5437`);
переопределить — `VITE_API_URL=... make all`.

## Запуск без контейнеров

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
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
| `GET` | `/aparts` | Таблица квартир: `price`, `price_prev/delta`, `price_max/delta`, `has_discount`, `discount_is_new`, `discount_pct`, `reserve`, `is_family`, `type_label`, `plan_url`, `tour_3d_url`, `metro[]`, `family_hypotec`, `is_favorite`, `mosres_url`. Query: `building_id`, `building_ids` (CSV), `favorites_only`, `discount_only`, `price_drop_only`, `reserved_only`, `family_only`, `q` |
| `GET` | `/aparts/{new_apart_id}/versions` | История изменений конкретной квартиры |
| `GET` | `/dashboard` | Метрики за сегодня (новые, изменения, падения/рост цены, новые скидки, ушли в резерв, средняя динамика). Query: `favorites_only` |
| `GET` | `/status` | Время последнего обновления данных + интервал планировщика |

### Избранное

Single-user, без авторизации. Хранится в таблице `favorites`.

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
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```