# CrewSense backend image for Fly.io.
#
# The release command (fly.toml) and the app process both run `python` from this image.
# Dependencies are installed into that same interpreter, so `python -m alembic` and
# `python -m uvicorn` always see them. The working directory /app holds alembic.ini,
# migrations/ and app/, so the relative paths in alembic.ini resolve correctly.
#
# PYTHON_IMAGE can be overridden for local verification; production uses the default.

ARG PYTHON_IMAGE=python:3.13-slim
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first, so this layer stays cached while application code changes.
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt \
    && python -m alembic --version

# Application code, Alembic configuration and migrations.
COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

# Secrets (DATABASE_URL, CREWSENSE_CORS_ORIGINS, CREWSENSE_SEED_DEMO) come from the
# platform at runtime. Nothing sensitive is baked into the image.
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT}"]
