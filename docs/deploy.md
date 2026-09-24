# Развёртывание: гипервизор, платформы и типовые ошибки

Всё, что нужно для запуска `make all` на чужой машине, и что обычно ломается.

Стек требует только **Docker** (движок + compose v2). Postgres, миграции и
пользователь по умолчанию поднимаются сами — см. «Что происходит при старте».

---

## Что происходит при старте

`docker compose up -d --build` (`make all`):

1. Поднимается `db` (postgres:16, том `pgdata`). Compose ждёт его healthcheck
   (`pg_isready`) — только потом запускает `api`.
2. Контейнер `api` на каждом старте выполняет:
   `alembic upgrade head` → `python -m src.users ensure` → `uvicorn`.
   Обе первые команды идемпотентны, рестарт безопасен. Если миграция упала —
   контейнер падает целиком (а не отдаёт API на старой схеме), смотреть
   `make logs`.
3. Поднимается `web` (nginx со сборкой фронта, проксирует `/api/` на `api:5433`).

Руками `make upgrade` больше не нужен — он остался для запуска **без**
контейнеров.

---

## Гипервизор по платформам

Docker-контейнеры — это ядро Linux. На macOS и Windows его нет, поэтому Docker
Desktop держит виртуальную машину, и без включённой аппаратной виртуализации
ничего не стартует.

### macOS (Intel и Apple Silicon)

- Docker Desktop использует встроенный **Apple Virtualization Framework** —
  включать ничего не надо, но нужны права администратора при первой установке.
- Настройки: Docker Desktop → Settings → Resources — минимум **4 GB RAM**
  (сборка фронта в `web` на 2 GB падает с `JavaScript heap out of memory`).
- Альтернативы Docker Desktop, на которых проект тоже работает: **Colima**
  (`colima start --cpu 4 --memory 6`) или **OrbStack**. После старта Colima
  `docker context` переключается сам.

**Apple Silicon (M1–M4).** Все используемые образы (`postgres:16`,
`python:3.13-slim`, `node`, `nginx`) есть под arm64 — пересборка под эмуляцией
не нужна. Если какой-то образ окажется только amd64, ошибка будет вида
`no matching manifest for linux/arm64/v8`; лечится включением Rosetta
(Settings → General → «Use Rosetta for x86/amd64 emulation») и добавлением в
нужный сервис `platform: linux/amd64` — ценой скорости.

### Windows

- Нужен **WSL 2**: `wsl --install`, перезагрузка, `wsl --set-default-version 2`.
- В Docker Desktop: Settings → General → «Use the WSL 2 based engine».
- В BIOS/UEFI должна быть включена виртуализация (Intel **VT-x**, AMD **SVM**),
  а в Windows — компоненты «Virtual Machine Platform» и «Windows Subsystem for
  Linux» (Панель управления → Программы → Компоненты Windows).
- Конфликты: одновременно работающие **VirtualBox/VMware старых версий** и
  Hyper-V мешают друг другу. Симптом — `Hardware assisted virtualization and
  data execution protection must be enabled in the BIOS`.
- Репозиторий держать **внутри WSL** (`\\wsl$\Ubuntu\home\...`), а не в
  `C:\Users\...`: сборка из `/mnt/c` в разы медленнее.
- `git config --global core.autocrlf input` — CRLF в файлах, попадающих в
  образ, ломает shell-команды внутри контейнера.

### Linux

- Гипервизор не нужен — контейнеры идут на родном ядре. Ставится docker engine +
  `docker-compose-plugin` (не пакет `docker-compose` v1: он не понимает
  `depends_on: condition: service_healthy`).
- `permission denied while trying to connect to the Docker daemon socket`:
  `sudo usermod -aG docker $USER`, затем перелогиниться.
- SELinux (Fedora/RHEL) может резать bind-mount'ы — если появится `permission
  denied` на томах, монтировать с суффиксом `:z`.
- `host.docker.internal` на Linux не существует сам по себе; в compose он уже
  добавлен через `extra_hosts: host-gateway` — нужен, только если БД внешняя.

---

## Типовые ошибки

| Симптом | Причина | Что делать |
|---|---|---|
| `Cannot connect to the Docker daemon` | демон не запущен / нет прав | запустить Docker Desktop (`colima start`); на Linux — группа `docker` |
| `bind: address already in use` на 5434 / 8080 / 5433 | порт занят другим проектом | поменять `WEB_PORT` в `.env` или левую часть `ports:` в compose |
| `api` в рестарт-цикле, в логах alembic-трейс | миграция упала | `make logs`; частый случай — база уже накатана другой веткой |
| `password authentication failed for user "mosres"` | том `pgdata` создан со старым паролем; `POSTGRES_PASSWORD` применяется только при первой инициализации | `docker compose down -v` (внимание: **удаляет данные**), затем `make all` |
| `Can't locate revision identified by '<hash>'` | в БД номер миграции, которого нет в коде (откатились на старую ветку) | обновить код до нужной ревизии или поднять чистую базу |
| `Target database is not up to date` при `make rev` | не накатаны миграции | `make upgrade` |
| `alembic ... Multiple head revisions` | смёрджены две ветки с миграциями | `uv run alembic merge heads` и накатить |
| `connection refused` к БД при старте api | база ещё не готова | не должно случаться: compose ждёт healthcheck. Если БД внешняя (`DB` в `.env`) — проверить доступность/VPN |
| 401 на всех запросах фронта | нет токена / сменился `SECRET_KEY` | войти заново; `SECRET_KEY` задать в `.env` и не менять |
| `Неверный логин или пароль` под `admin/admin` | база создана раньше, чем появился `ensure`, либо логин менялся | `uv run python -m src.users list`, при необходимости `add`/`passwd` |
| Фронт собирается и падает на `heap out of memory` | мало RAM у VM Docker | поднять память до 4–6 GB в настройках Docker Desktop/Colima |
| Тесты падают с ошибкой запуска контейнера | тесты используют testcontainers — нужен работающий Docker | запустить Docker; `TESTCONTAINERS_RYUK_DISABLED=true` уже выставлен в conftest |

---

## Чистый перезапуск

```bash
make down              # остановить
docker compose down -v # + удалить том с данными (БД будет пустой)
make all               # пересобрать и поднять; миграции накатятся сами
```
