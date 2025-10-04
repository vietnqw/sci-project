FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1
# Compile bytecode
ENV UV_COMPILE_BYTECODE=1
# uv Caching
ENV UV_LINK_MODE=copy

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installing uv
COPY --from=ghcr.io/astral-sh/uv:0.7.20 /uv /uvx /bin/

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# Installing project files
COPY ./app /app/app
COPY ./scripts /app/scripts
COPY ./data /app/data
COPY ./alembic /app/alembic
COPY ./pyproject.toml ./uv.lock ./README.md ./alembic.ini /app/

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

# Using the environment
ENV PATH="/app/.venv/bin:$PATH"

ENV PYTHONPATH=/app

# Default command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
