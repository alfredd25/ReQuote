"""
database.py – SQLAlchemy async engine and session management.

Runtime driver : asyncpg  (postgresql+asyncpg://)
Alembic driver : psycopg2 (postgresql+psycopg2://) – configured in alembic/env.py
"""

from collections.abc import AsyncGenerator
import re

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings


def get_async_database_url(url: str) -> str:
    """
    Ensure the database URL uses the asyncpg driver and compatible query parameters.
    Supports Neon, Supabase, Render, Docker Compose, and local Postgres.
    """
    # Standardize scheme
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

    # Asyncpg expects ssl= rather than sslmode=
    if "sslmode=" in url:
        url = url.replace("sslmode=", "ssl=")

    return url


def get_sync_database_url(url: str) -> str:
    """
    Convert any postgresql:// variant to a psycopg2 URL for Alembic migrations.
    Ensures compatibility with Neon, Supabase, and cloud PostgreSQL providers.
    """
    url = re.sub(r"^postgres://", "postgresql+psycopg2://", url)
    url = re.sub(r"^postgresql\+asyncpg://", "postgresql+psycopg2://", url)
    url = re.sub(r"^postgresql://", "postgresql+psycopg2://", url)
    if "ssl=" in url and "sslmode=" not in url:
        url = url.replace("ssl=", "sslmode=")
    return url


_db_url = get_async_database_url(settings.database_url)

# Configure engine options based on dialect
engine_kwargs: dict = {
    "echo": settings.debug,
    "pool_pre_ping": True,
}

if not _db_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": 3,
            "max_overflow": 2,
            "pool_recycle": 1800,
        }
    )

engine = create_async_engine(_db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

