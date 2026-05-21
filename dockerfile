FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.4 /uv /usr/local/bin/uv

WORKDIR /app

ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONOPTIMIZE=1

COPY pyproject.toml .python-version uv.lock .
RUN uv sync --frozen --no-dev

EXPOSE 5457
COPY src/ src/
VOLUME [ "fastapi:/src/excel" ]
ENTRYPOINT ["uv", "run", "uvicorn", "src.api:app", "--reload", "--port", "5457", "--host", "0.0.0.0"]