.PHONY: all up down logs ps rebuild test rev upgrade run get

# Bring up api + web via docker compose. The database is external — set DB in .env
# (use host.docker.internal as the host for a DB running on this machine).
# Apply migrations once with `make upgrade` before the first `make all`.
all: up

up:
	docker compose up -d --build
	@echo ""
	@echo "  api   http://localhost:5437   docs: /docs"
	@echo "  web   http://localhost:5173"
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
