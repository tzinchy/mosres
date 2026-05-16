.PHONY: get
.PHONY: revision
.PHONY: upgrade

get:
	uv run src/service.py

rev: 
	alembic revision --autogenerate

upgrade:
	alembic upgrade head