"""
business_profile.py – Pydantic request and response schemas for BusinessProfile.
"""

from datetime import datetime
import re
from typing import Annotated
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class BusinessProfileBase(BaseModel):
    """Base fields for business profile & settings."""

    business_name: Annotated[
        str | None,
        Field(default=None, max_length=255, description="Business or company name"),
    ] = None
    contact_person: Annotated[
        str | None,
        Field(default=None, max_length=255, description="Primary representative"),
    ] = None
    email: Annotated[
        str | None,
        Field(default=None, max_length=255, description="Business contact email"),
    ] = None
    phone: Annotated[
        str | None,
        Field(default=None, max_length=50, description="Business phone number"),
    ] = None
    address: Annotated[
        str | None,
        Field(default=None, max_length=1000, description="Business address"),
    ] = None
    website: Annotated[
        str | None,
        Field(default=None, max_length=255, description="Website URL"),
    ] = None
    logo_url: Annotated[
        str | None,
        Field(default=None, max_length=2000, description="Public logo image URL"),
    ] = None
    tax_id: Annotated[
        str | None,
        Field(default=None, max_length=100, description="Tax ID, VAT, or EIN"),
    ] = None
    default_currency: Annotated[
        str,
        Field(default="USD", min_length=3, max_length=3, description="ISO 4217 currency code"),
    ] = "USD"
    default_notes: Annotated[
        str | None,
        Field(default=None, max_length=2000, description="Default quotation notes"),
    ] = None
    default_terms: Annotated[
        str | None,
        Field(default=None, max_length=3000, description="Default quotation terms"),
    ] = None

    @field_validator(
        "business_name",
        "contact_person",
        "email",
        "phone",
        "address",
        "website",
        "logo_url",
        "tax_id",
        "default_notes",
        "default_terms",
        mode="before",
    )
    @classmethod
    def strip_and_empty_to_none(cls, v: str | None) -> str | None:
        """Strip whitespace and convert blank strings to None."""
        if v is None:
            return None
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is not None and not EMAIL_REGEX.match(v):
            raise ValueError(f"'{v}' is not a valid email address.")
        return v

    @field_validator("default_currency", mode="before")
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        if isinstance(v, str):
            code = v.strip().upper()
            if len(code) == 3 and code.isalpha():
                return code
        return "USD"


class BusinessProfileUpdate(BusinessProfileBase):
    """Payload to create or update user's business profile."""
    pass


class BusinessProfileResponse(BusinessProfileBase):
    """Schema returned by business profile endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID | None = None
    user_id: uuid.UUID
    email: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
