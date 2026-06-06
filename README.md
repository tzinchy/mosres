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
| `GET` | `/update_data` | Забрать свежие данные с москварталы.рф и сохранить в БД |
| `GET` | `/file` | Скачать Excel-файл со всеми данными на текущую дату |

### Квартиры

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/new_aparts` | Список квартир. Опциональный query-параметр: `new_aparts_ids` |
| `GET` | `/new_aparts/{new_apart_id}/versions` | История изменений конкретной квартиры |

### Корпуса

| Метод | Эндпоинт | Описание |
|---|---|---|
| `GET` | `/buildings` | Список всех корпусов |
| `GET` | `/buildings/{building_id}/versions` | История изменений конкретного корпуса |

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