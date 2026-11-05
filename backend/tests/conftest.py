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
import uuid
import httpx
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.user import User
from app.security import create_access_token, hash_password


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

def make_user(session: Session, **kwargs) -> User:
    """Create and flush a minimal User."""
    unique_id = uuid.uuid4().hex[:8]
    defaults = dict(
        email=f"user_{unique_id}@example.com",
        hashed_password="hashed_test_password",
        full_name="Test User",
        is_active=True,
    )
    defaults.update(kwargs)
    u = User(**defaults)
    session.add(u)
    session.flush()
    return u


def make_quotation(session: Session, **kwargs) -> Quotation:
    """Create and flush a minimal Quotation."""
    if "user_id" not in kwargs:
        user = make_user(session)
        kwargs["user_id"] = user.id
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


# ── Async fixtures for FastAPI & HTTPX API testing ────────────────────────────

@pytest.fixture
async def async_engine():
    """Function-scoped async SQLite in-memory engine."""
    _engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    await _engine.dispose()


@pytest.fixture
async def async_db(async_engine):
    """Function-scoped async database session."""
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(async_db):
    """
    HTTPX AsyncClient configured to dispatch requests directly to FastAPI
    with the database dependency overridden to use the in-memory test session.
    """
    async def override_get_db():
        yield async_db

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_user(async_db: AsyncSession) -> User:
    """Creates a primary authenticated user in the test database."""
    user = User(
        email=f"primary_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Primary Test User",
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)
    return user


@pytest.fixture
def auth_token(auth_user: User) -> str:
    """Generates a valid JWT access token for auth_user."""
    return create_access_token(
        subject=auth_user.id,
        extra_claims={"email": auth_user.email},
    )


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    """Returns HTTP headers dictionary with the primary user's Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def second_user(async_db: AsyncSession) -> User:
    """Creates a second user in the test database for testing cross-user authorization."""
    user = User(
        email=f"second_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Second Test User",
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)
    return user


@pytest.fixture
def second_auth_token(second_user: User) -> str:
    """Generates a valid JWT access token for second_user."""
    return create_access_token(
        subject=second_user.id,
        extra_claims={"email": second_user.email},
    )


@pytest.fixture
def second_auth_headers(second_auth_token: str) -> dict[str, str]:
    """Returns HTTP headers dictionary with the second user's Bearer token."""
    return {"Authorization": f"Bearer {second_auth_token}"}
