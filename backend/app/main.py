# pyrefly: ignore[missing-import]
from fastapi import FastAPI
# pyrefly: ignore[missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, quotations

app = FastAPI(
    title="ReQuote API",
    description="Backend API for the ReQuote quote estimation platform.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS – tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(health.router, prefix="/api", include_in_schema=False)
app.include_router(quotations.router)
app.include_router(quotations.router, prefix="/api", include_in_schema=False)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"message": "ReQuote API is running. Visit /docs for the API reference."}
