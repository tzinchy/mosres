.PHONY: get
.PHONY: revision
.PHONY: upgrade
.PHONY: run

get:
	uv run -m src.service.py

rev: 
	alembic revision --autogenerate

upgrade:
	alembic upgrade head

run:
	uv run uvicorn src.api:app --reload 