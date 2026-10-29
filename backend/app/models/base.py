"""
base.py – Shared declarative base and TimestampMixin.

All models import Base from here so Alembic can discover them via
a single metadata reference.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Project-wide declarative base class."""


class TimestampMixin:
    """Adds server-side created_at / updated_at columns to any model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


def new_uuid() -> uuid.UUID:
    """Callable default for UUID primary keys."""
    return uuid.uuid4()
