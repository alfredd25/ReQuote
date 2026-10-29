"""
conftest.py – Shared pytest fixtures for the backend test suite.

Phase 2 tests are fully in-memory using SQLite so they run without a
running PostgreSQL instance. The SQLite dialect does not support all
PostgreSQL types (e.g. UUID, NUMERIC constraints), so fixtures use
native_uuid=False and render_as_batch=False for maximum compat.

Phase 3+ integration tests against a real DB will use a separate
conftest or mark.
"""

import pytest
from decimal import Decimal
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.models.base import Base
from app.models.quotation import Quotation, QuotationItem, QuotationStatus


# ── In-memory SQLite engine ──────────────────────────────────────────────────

@pytest.fixture(scope="session")
def engine():
    """Session-scoped SQLite in-memory engine."""
    _engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    # SQLite doesn't enforce FK constraints by default
    @event.listens_for(_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(_engine)
    yield _engine
    _engine.dispose()


@pytest.fixture
def db_session(engine):
    """
    Function-scoped database session.

    Wraps each test in a transaction that is rolled back afterwards so
    tests are isolated without recreating the schema.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ── Sample-data helpers ──────────────────────────────────────────────────────

def make_quotation(session: Session, **kwargs) -> Quotation:
    """Create and flush a minimal Quotation."""
    defaults = dict(
        quotation_number="RQ-TEST-0001",
        title="Test Quote",
        status=QuotationStatus.DRAFT.value,
        customer_name="Acme Corp",
        customer_email="billing@acme.example",
        currency="USD",
        subtotal=Decimal("0.0000"),
        tax_rate=Decimal("0.0000"),
        tax_amount=Decimal("0.0000"),
        total_amount=Decimal("0.0000"),
    )
    defaults.update(kwargs)
    q = Quotation(**defaults)
    session.add(q)
    session.flush()
    return q


def make_item(
    session: Session,
    quotation: Quotation,
    *,
    position: int = 1,
    description: str = "Widget",
    quantity: str = "2.0000",
    unit_price: str = "10.0000",
) -> QuotationItem:
    """Create and flush a minimal QuotationItem."""
    qty = Decimal(quantity)
    price = Decimal(unit_price)
    item = QuotationItem(
        quotation_id=quotation.id,
        position=position,
        description=description,
        quantity=qty,
        unit_price=price,
        line_total=qty * price,
    )
    session.add(item)
    session.flush()
    return item
