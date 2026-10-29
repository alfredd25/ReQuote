"""
alembic/env.py – Alembic migration environment.

Uses the synchronous psycopg2 driver (postgresql+psycopg2://) because
Alembic's default migration runner is synchronous.

The DATABASE_URL env var (set via .env or Docker Compose) is converted
from the plain postgresql:// scheme automatically.
"""

import os
import re
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Import all models so Alembic can detect schema changes ───────────────────
# This must happen before target_metadata is read.
from app.models import Base  # noqa: F401 – registers all model metadata
import app.models.quotation  # noqa: F401 – explicit import for safety

# ── Alembic Config object ────────────────────────────────────────────────────
config = context.config

# Wire Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _sync_url(url: str) -> str:
    """Convert any postgresql:// variant to a psycopg2 URL for Alembic."""
    url = re.sub(r"^postgresql\+asyncpg://", "postgresql+psycopg2://", url)
    url = re.sub(r"^postgresql://", "postgresql+psycopg2://", url)
    return url


def _get_url() -> str:
    """Read DATABASE_URL from the environment, falling back to alembic.ini."""
    raw = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url", "")
    if not raw:
        raise RuntimeError(
            "DATABASE_URL is not set. "
            "Copy .env.example to .env and set the variable, "
            "or pass it when running alembic."
        )
    return _sync_url(raw)


def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection ('offline' mode).

    Generates SQL scripts instead of executing them.
    """
    url = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations with a live DB connection ('online' mode).

    Used by `alembic upgrade head`.
    """
    url = _get_url()

    # Override whatever alembic.ini says
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No pooling needed for one-shot migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
