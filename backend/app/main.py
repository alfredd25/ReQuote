import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, health, profile, quotations

# ── Structured Logging Configuration ──────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("requote.api")

app = FastAPI(
    title="ReQuote API",
    description="Backend API for the ReQuote quote estimation platform.",
    version="0.1.0",
    docs_url="/docs" if settings.debug or settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.debug or settings.app_env != "production" else None,
)

# ── Security & Payload Size Middleware ─────────────────────────────────────────
@app.middleware("http")
async def security_and_limit_middleware(request: Request, call_next):
    # Enforce request payload size limit (mitigate payload DoS)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.max_request_body_bytes:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": f"Payload exceeds maximum allowed limit of {settings.max_request_body_bytes} bytes."
                    },
                )
        except ValueError:
            pass

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled exception during request %s %s: %s", request.method, request.url.path, exc)
        if settings.app_env == "development" or settings.debug:
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": f"Internal server error: {exc}"},
            )
        else:
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "An internal server error occurred."},
            )

    # Standard security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response



# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(health.router, prefix="/api", include_in_schema=False)
app.include_router(auth.router)
app.include_router(auth.router, prefix="/api", include_in_schema=False)
app.include_router(quotations.router)
app.include_router(quotations.router, prefix="/api", include_in_schema=False)
app.include_router(profile.router)
app.include_router(profile.router, prefix="/api", include_in_schema=False)
app.include_router(profile.router, prefix="/business-profile", include_in_schema=False)
app.include_router(profile.router, prefix="/api/business-profile", include_in_schema=False)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"message": "ReQuote API is running. Visit /docs for the API reference."}

