.PHONY: all up down logs ps rebuild test rev upgrade run get

# Bring up db + api + web via docker compose. Migrations and the default user are
# applied by the api container itself on every start — no `make upgrade` needed
# here. `make upgrade` below is for running the app WITHOUT containers.
all: up

up:
	docker compose up -d --build
	@echo ""
	@echo "  web   http://localhost:$${WEB_PORT:-8080}   (вход: admin / admin)"
	@echo "  api   http://127.0.0.1:5433/docs   (loopback only; web proxies /api/)"
	@echo "  logs: make logs   |   stop: make down"

down:
	docker compose down

logs:
	docker compose logs -f --tail=50

ps:
	docker compose ps

rebuild:
	docker compose build --no-cache

# --- local (non-container) helpers ----------------------------------------

test:
	uv run pytest

rev:
	uv run alembic revision --autogenerate

upgrade:
	uv run alembic upgrade head

run:
	uv run uvicorn src.api:app --reload

get:
	uv run -m src.service
