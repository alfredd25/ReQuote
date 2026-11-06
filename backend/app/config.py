import json
from typing import Any
from pydantic import field_validator
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
    log_level: str = "INFO"
    max_request_body_bytes: int = 2 * 1024 * 1024  # 2 MB request body limit

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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        """
        Accepts list of origins, JSON string array, or comma-separated string:
        e.g. 'https://my-app.vercel.app,http://localhost:5173'
        """
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    pass
            # Split comma-separated string
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, (list, tuple, set)):
            return [str(item).strip() for item in v if item]
        return []


settings = Settings()

