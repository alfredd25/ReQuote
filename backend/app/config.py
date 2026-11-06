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

    # Authentication / JWT
    jwt_secret_key: str = "changeme_super_secret_jwt_key_at_least_32_bytes_long_requote_2026"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # Business Details (Quotation PDF Header & Issuer Information)
    business_name: str = "ReQuote Solutions"
    business_email: str = "contact@requote.io"
    business_phone: str = "+1 (555) 019-2834"
    business_address: str = "100 Innovation Way, Suite 500, San Francisco, CA 94105"
    business_website: str = "https://requote.io"


settings = Settings()
