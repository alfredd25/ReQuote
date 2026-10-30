"""
quotation.py – Pydantic schemas for Quotation and QuotationItem endpoints.

Follows the SQLAlchemy models in app.models.quotation with strict validation
and server-side calculation guarantees.
"""

from datetime import datetime
from decimal import Decimal
import re
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.quotation import QuotationStatus

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ── QuotationItem Schemas ─────────────────────────────────────────────────────

class QuotationItemBase(BaseModel):
    """Common attributes for quotation line items."""

    description: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Description of what is being quoted",
    )
    unit: str | None = Field(
        default=None,
        max_length=50,
        description="Unit of measure, e.g. 'hour', 'piece', 'kg'",
    )
    quantity: Decimal = Field(
        ...,
        gt=0,
        description="Quantity, must be strictly greater than 0",
    )
    unit_price: Decimal = Field(
        ...,
        ge=0,
        description="Unit price, non-negative",
    )
    position: int | None = Field(
        default=None,
        ge=1,
        description="1-based display position; automatically assigned if omitted",
    )

    @field_validator("description")
    @classmethod
    def validate_description_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("description cannot be blank")
        return trimmed


class QuotationItemCreate(QuotationItemBase):
    """
    Schema for creating a line item within a quotation.

    Note: `line_total` is never accepted from the client; it is always
    computed server-side as (quantity * unit_price).
    """


class QuotationItemResponse(BaseModel):
    """Schema for serializing a stored quotation line item."""

    id: uuid.UUID
    quotation_id: uuid.UUID
    position: int
    description: str
    unit: str | None = None
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Quotation Schemas ─────────────────────────────────────────────────────────

class QuotationBase(BaseModel):
    """Common quotation attributes."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Title or subject of the quotation",
    )
    description: str | None = Field(
        default=None,
        description="Optional detailed description or project overview",
    )
    customer_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Customer or company contact name",
    )
    customer_email: str | None = Field(
        default=None,
        max_length=255,
        description="Customer email address",
    )
    customer_phone: str | None = Field(
        default=None,
        max_length=50,
        description="Customer phone number",
    )
    customer_company: str | None = Field(
        default=None,
        max_length=255,
        description="Customer company or organization",
    )
    customer_address: str | None = Field(
        default=None,
        description="Customer physical/billing address",
    )
    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO 4217 three-letter currency code (e.g. USD, EUR)",
    )
    tax_rate: Decimal = Field(
        default=Decimal("0.0000"),
        ge=0,
        le=1,
        description="Fractional tax rate (e.g. 0.1000 = 10%)",
    )
    notes: str | None = Field(
        default=None,
        description="Internal or external notes",
    )
    terms_and_conditions: str | None = Field(
        default=None,
        description="Terms and conditions for this quote",
    )

    @field_validator("title", "customer_name")
    @classmethod
    def validate_non_blank_strings(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be blank")
        return trimmed

    @field_validator("customer_email", mode="before")
    @classmethod
    def validate_and_normalize_email(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, str):
            trimmed = v.strip()
            if not trimmed:
                return None
            if not EMAIL_REGEX.match(trimmed):
                raise ValueError("Invalid email address format")
            return trimmed
        return v

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, v: Any) -> Any:
        if isinstance(v, str):
            trimmed = v.strip().upper()
            if len(trimmed) != 3 or not trimmed.isalpha():
                raise ValueError("currency must be a 3-letter alphabetic code")
            return trimmed
        return v


class QuotationCreate(QuotationBase):
    """
    Schema for creating a new quotation.

    `quotation_number` is optional; if omitted, the backend generates
    a unique identifier (e.g. RQ-YYYYMMDD-XXXXXX).
    All totals (`subtotal`, `tax_amount`, `total_amount`) are computed
    server-side using Decimal arithmetic.
    """

    quotation_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=32,
        description="Optional custom identifier. Auto-generated if omitted.",
    )
    items: list[QuotationItemCreate] = Field(
        default_factory=list,
        description="Line items for this quotation",
    )

    @field_validator("quotation_number", mode="before")
    @classmethod
    def empty_quotation_number_to_none(cls, v: Any) -> Any:
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v


class QuotationResponse(BaseModel):
    """Schema for returning quotation details with line items."""

    id: uuid.UUID
    quotation_number: str
    title: str
    description: str | None = None
    status: QuotationStatus
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_company: str | None = None
    customer_address: str | None = None
    currency: str
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    notes: str | None = None
    terms_and_conditions: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[QuotationItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class QuotationListResponse(BaseModel):
    """Paginated response envelope for quotations list."""

    items: list[QuotationResponse]
    total: int = Field(ge=0, description="Total matching quotations count")
    page: int = Field(ge=1, description="Current page number (1-based)")
    page_size: int = Field(ge=1, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")


class QuotationUpdate(BaseModel):
    """
    Schema for updating an existing quotation.

    All fields are optional. Providing `items` replaces the entire line items
    list and triggers total recalculation via Decimal arithmetic.
    """

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated quotation title",
    )
    description: str | None = None
    customer_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated customer contact name",
    )
    customer_email: str | None = Field(
        default=None,
        max_length=255,
        description="Updated customer email address",
    )
    customer_phone: str | None = Field(
        default=None,
        max_length=50,
        description="Updated customer phone number",
    )
    customer_company: str | None = Field(
        default=None,
        max_length=255,
        description="Updated customer company",
    )
    customer_address: str | None = None
    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="Updated ISO 4217 three-letter currency code",
    )
    tax_rate: Decimal | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Updated tax rate (e.g. 0.1000 = 10%)",
    )
    notes: str | None = None
    terms_and_conditions: str | None = None
    items: list[QuotationItemCreate] | None = Field(
        default=None,
        description="Replacement line items for this quotation",
    )

    @field_validator("title", "customer_name")
    @classmethod
    def validate_non_blank_strings(cls, v: str | None) -> str | None:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Field cannot be blank")
            return trimmed
        return v

    @field_validator("customer_email", mode="before")
    @classmethod
    def validate_and_normalize_email(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, str):
            trimmed = v.strip()
            if not trimmed:
                return None
            if not EMAIL_REGEX.match(trimmed):
                raise ValueError("Invalid email address format")
            return trimmed
        return v

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, v: Any) -> Any:
        if v is not None and isinstance(v, str):
            trimmed = v.strip().upper()
            if len(trimmed) != 3 or not trimmed.isalpha():
                raise ValueError("currency must be a 3-letter alphabetic code")
            return trimmed
        return v


class QuotationStatusUpdate(BaseModel):
    """Schema for updating the lifecycle status of a quotation."""

    status: QuotationStatus = Field(
        ...,
        description="Target lifecycle status (e.g. sent, accepted, rejected, expired, cancelled)",
    )
