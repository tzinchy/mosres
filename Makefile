.PHONY: get
.PHONY: revision
.PHONY: upgrade

get:
	uv run -m src.service.py

rev: 
	alembic revision --autogenerate

upgrade:
	alembic upgrade head