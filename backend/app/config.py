# pyrefly: ignore[missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = "development"
    debug: bool = False

    # Database
    database_url: str = "postgresql://requote:requote@db:5432/requote"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:80"]


settings = Settings()
