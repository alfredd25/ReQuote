import time
import logging
from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live", summary="Process liveness check", status_code=status.HTTP_200_OK)
async def liveness_check() -> dict:
    """Fast liveness check indicating the web service process is running."""
    return {"status": "alive"}


@router.get("/ready", summary="Readiness check")
async def readiness_check(response: Response) -> dict:
    """Readiness check verifying database connectivity."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as exc:
        logger.warning("Readiness probe failed: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "error": "Database unreachable"}


@router.get("", summary="Comprehensive health check")
async def health_check(response: Response) -> dict:
    """Returns service health status and database latency."""
    db_status = "unreachable"
    db_latency_ms: float | None = None

    try:
        start = time.monotonic()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_latency_ms = round((time.monotonic() - start) * 1000, 2)
        db_status = "ok"
    except Exception as exc:
        logger.warning("Database health check failed: %s", exc)
        db_status = f"error: {exc}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "requote-api",
        "version": "0.1.0",
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
        },
    }

