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

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/tzinchy/mosres.git
cd mosres
```

### 2. Установить зависимости

```bash
uv sync
```

### 3. Настроить переменные окружения

Создать `.env` на основе примера:

```bash
cp .env.example .env
```

Минимальный `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/postgres
```

### 4. Поднять базу данных

```bash
docker compose up -d
```

### 5. Применить миграции

```bash
uv run alembic upgrade head
```

### 6. Запустить сервис

```bash
uv run uvicorn src.main:app --reload
```

Документация доступна по адресу: [http://localhost:8000/docs](http://localhost:8000/docs)

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
| `GET` | `/aparts` | Таблица квартир с вычисляемыми полями: `price`, `price_prev`, `price_delta_prev(_pct)`, `price_max`, `price_delta_max_pct`, `has_discount`, `discount_is_new`, `discount_pct`, `is_favorite`, `mosres_url`. Query-параметры: `building_id`, `favorites_only`, `discount_only`, `price_drop_only`, `q` |
| `GET` | `/aparts/{new_apart_id}/versions` | История изменений конкретной квартиры |

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

APScheduler (`AsyncIOScheduler`) запускает `refresh_all()` раз в сутки в `REFRESH_HOUR` (по умолчанию 4 часа).
Старт/остановка — в `lifespan` FastAPI.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `SCHEDULER_ENABLED` | `true` | Включить планировщик при старте приложения |
| `REFRESH_HOUR` | `4` | Час суток для ежедневного обновления |

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