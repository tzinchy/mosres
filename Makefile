.PHONY: get
.PHONY: revision
.PHONY: upgrade
.PHONY: run
.PHONY: test

get:
	uv run -m src.service.py

rev: 
	alembic revision --autogenerate

upgrade:
	alembic upgrade head

run:
	uv run uvicorn src.api:app --reload

test:
	uv run pytest 