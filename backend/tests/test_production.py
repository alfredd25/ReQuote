"""
test_production.py – Tests for Phase 9 production readiness features:
- Health & readiness probes (/health, /health/live, /health/ready)
- Security headers
- Request payload size limiter (413 Request Entity Too Large)
- Exception handler error sanitization in production
- Database URL conversions for cloud Postgres (Neon, Supabase)
- CORS origin parser
"""

import pytest
import httpx
from fastapi import APIRouter
from app.config import Settings
from app.database import get_async_database_url, get_sync_database_url
from app.main import app


@pytest.mark.asyncio
async def test_health_live_endpoint(client: httpx.AsyncClient):
    """GET /health/live should return 200 with status alive."""
    res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.json() == {"status": "alive"}


@pytest.mark.asyncio
async def test_health_ready_endpoint(client: httpx.AsyncClient):
    """GET /health/ready should respond with ready or not_ready."""
    res = await client.get("/health/ready")
    assert res.status_code in (200, 503)
    data = res.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_health_endpoint(client: httpx.AsyncClient):
    """GET /health should return overall health info."""
    res = await client.get("/health")
    assert res.status_code in (200, 503)
    data = res.json()
    assert data["service"] == "requote-api"
    assert "database" in data


@pytest.mark.asyncio
async def test_security_headers_present(client: httpx.AsyncClient):
    """Responses should include standard security headers."""
    res = await client.get("/health/live")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_payload_size_limit_rejection(client: httpx.AsyncClient):
    """A request with content-length exceeding max allowed bytes must return 413."""
    # Send content-length header indicating 10MB payload
    headers = {"content-length": str(10 * 1024 * 1024)}
    res = await client.post("/auth/login", headers=headers, json={"email": "a@b.com", "password": "x"})
    assert res.status_code == 413
    assert "Payload exceeds maximum allowed limit" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unhandled_exception_sanitization_in_production(monkeypatch):
    """In production mode, unhandled internal errors should not leak stack traces."""
    # Temporarily mount a route that raises an unhandled exception
    test_router = APIRouter()

    @test_router.get("/test-unhandled-crash")
    async def crash():
        raise RuntimeError("Secret internal database password or private key detail!")

    app.include_router(test_router)

    from app.config import settings

    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "debug", False)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/test-unhandled-crash")
        assert res.status_code == 500
        data = res.json()
        assert data["detail"] == "An internal server error occurred."
        assert "Secret" not in res.text
        assert "RuntimeError" not in res.text


def test_cors_origins_parsing():
    """CORS origins should parse comma-separated strings, json lists, and raw lists."""
    # Comma-separated string
    s1 = Settings(cors_origins="https://app.vercel.app, https://admin.example.com")
    assert s1.cors_origins == ["https://app.vercel.app", "https://admin.example.com"]

    # JSON array string
    s2 = Settings(cors_origins='["https://app.vercel.app", "http://localhost:3000"]')
    assert s2.cors_origins == ["https://app.vercel.app", "http://localhost:3000"]

    # Plain list
    s3 = Settings(cors_origins=["https://one.com", "https://two.com"])
    assert s3.cors_origins == ["https://one.com", "https://two.com"]


def test_database_url_conversion():
    """Async URL converter must produce valid asyncpg scheme and handle sslmode query."""
    # Render / Heroku / Neon standard postgres://
    url1 = get_async_database_url("postgres://user:pass@host.neon.tech:5432/neondb?sslmode=require")
    assert url1.startswith("postgresql+asyncpg://")
    assert "ssl=require" in url1
    assert "sslmode=" not in url1

    # Standard postgresql://
    url2 = get_async_database_url("postgresql://user:pass@db:5432/requote")
    assert url2.startswith("postgresql+asyncpg://")

    # channel_binding is stripped for asyncpg; ssl is preserved
    url3 = get_async_database_url(
        "postgres://user:pass@host.neon.tech/db?sslmode=require&channel_binding=require"
    )
    assert "channel_binding" not in url3
    assert "ssl=require" in url3

    # channel_binding must NOT be stripped from the sync/psycopg2 URL
    sync_url = get_sync_database_url(
        "postgres://user:pass@host.neon.tech/db?sslmode=require&channel_binding=require"
    )
    assert sync_url.startswith("postgresql+psycopg2://")
    assert "channel_binding=require" in sync_url
    assert "sslmode=require" in sync_url

    # Alembic sync url converter
    sync1 = get_sync_database_url("postgres://user:pass@host:5432/db?ssl=require")
    assert sync1.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in sync1
