import time
# pyrefly: ignore[missing-import]
import asyncpg
# pyrefly: ignore[missing-import]
from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Health check")
async def health_check() -> dict:
    """Returns service health including database connectivity."""
    db_status = "unreachable"
    db_latency_ms: float | None = None

    try:
        start = time.monotonic()
        conn = await asyncpg.connect(settings.database_url, timeout=5)
        await conn.fetchval("SELECT 1")
        await conn.close()
        db_latency_ms = round((time.monotonic() - start) * 1000, 2)
        db_status = "ok"
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {exc}"

    return {
        "status": "ok",
        "service": "requote-api",
        "version": "0.1.0",
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
        },
    }
