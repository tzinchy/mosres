FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.4 /uv /usr/local/bin/uv

WORKDIR /app

ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONOPTIMIZE=1

COPY pyproject.toml .python-version uv.lock ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY alembic/ alembic/
COPY src/ src/
VOLUME [ "/app/src/excel" ]

EXPOSE 5437
# Migrations are NOT run automatically — apply them against your database with
#   make upgrade      (or: uv run alembic upgrade head)
CMD ["uv", "run", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "5433"]
