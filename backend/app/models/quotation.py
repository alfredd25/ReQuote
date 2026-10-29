"""
quotation.py – Quotation and QuotationItem SQLAlchemy models.

Design notes
────────────
- All monetary values use NUMERIC(12, 4) to avoid floating-point drift.
  Python side: Decimal, never float.
- Quotation numbers are human-readable strings (e.g. "RQ-2024-0001");
  the generation strategy will be implemented in Phase 3.
- UUIDs are used as primary keys to avoid sequential ID enumeration.
- line_total is stored (not computed on-the-fly) so historical records
  remain accurate even if unit prices change later.
"""

import uuid
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


# ── Status enum ──────────────────────────────────────────────────────────────

class QuotationStatus(str, Enum):
    """Lifecycle states of a quotation."""

    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


# ── Models ───────────────────────────────────────────────────────────────────

class Quotation(TimestampMixin, Base):
    """
    A quote sent to a customer.

    One Quotation → many QuotationItems (cascade delete-orphan).
    """

    __tablename__ = "quotations"
    __table_args__ = (
        UniqueConstraint("quotation_number", name="uq_quotation_number"),
        CheckConstraint("subtotal >= 0", name="ck_quotation_subtotal_non_negative"),
        CheckConstraint("tax_amount >= 0", name="ck_quotation_tax_non_negative"),
        CheckConstraint("total_amount >= 0", name="ck_quotation_total_non_negative"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=new_uuid,
    )

    # ── Identification ───────────────────────────────────────────────────────
    quotation_number: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Human-readable identifier, e.g. RQ-2024-0001",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ── Status ───────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=QuotationStatus.DRAFT.value,
        comment="QuotationStatus enum value",
    )

    # ── Customer details ─────────────────────────────────────────────────────
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Monetary totals ──────────────────────────────────────────────────────
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        comment="ISO 4217 currency code",
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
        default=Decimal("0.0000"),
        comment="Sum of all line_totals",
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
        default=Decimal("0.0000"),
        comment="Fractional rate, e.g. 0.1000 = 10 %",
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
        default=Decimal("0.0000"),
        comment="subtotal + tax_amount",
    )

    # ── Notes ────────────────────────────────────────────────────────────────
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    items: Mapped[list["QuotationItem"]] = relationship(
        "QuotationItem",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationItem.position",
        lazy="select",
    )

    # ── Helpers ──────────────────────────────────────────────────────────────
    def recalculate_totals(self) -> None:
        """
        Recompute subtotal, tax_amount, and total_amount from items.

        Call this whenever items are added, removed, or modified.
        All arithmetic uses Decimal to preserve precision.
        """
        self.subtotal = sum(
            (item.line_total for item in self.items),
            Decimal("0.0000"),
        )
        self.tax_amount = (self.subtotal * self.tax_rate).quantize(Decimal("0.0001"))
        self.total_amount = self.subtotal + self.tax_amount

    def __repr__(self) -> str:
        return f"<Quotation {self.quotation_number!r} status={self.status!r}>"


class QuotationItem(TimestampMixin, Base):
    """
    A single line item within a Quotation.

    line_total = quantity × unit_price (stored for historical accuracy).
    """

    __tablename__ = "quotation_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_item_unit_price_non_negative"),
        CheckConstraint("line_total >= 0", name="ck_item_line_total_non_negative"),
        CheckConstraint("position >= 1", name="ck_item_position_positive"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=new_uuid,
    )

    # ── Foreign key ──────────────────────────────────────────────────────────
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Line details ─────────────────────────────────────────────────────────
    position: Mapped[int] = mapped_column(
        nullable=False,
        default=1,
        comment="Display order within the quotation",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="What is being quoted for this line",
    )
    unit: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Unit of measure, e.g. 'hour', 'piece', 'kg'",
    )

    # ── Monetary fields ──────────────────────────────────────────────────────
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        comment="Supports fractional quantities",
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
        comment="Price per unit in the parent quotation's currency",
    )
    line_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
        comment="quantity × unit_price, stored for historical accuracy",
    )

    # ── Relationship ─────────────────────────────────────────────────────────
    quotation: Mapped["Quotation"] = relationship(
        "Quotation",
        back_populates="items",
    )

    # ── Helpers ──────────────────────────────────────────────────────────────
    def compute_line_total(self) -> Decimal:
        """Return quantity × unit_price as a Decimal."""
        return (self.quantity * self.unit_price).quantize(Decimal("0.0001"))

    def __repr__(self) -> str:
        return (
            f"<QuotationItem pos={self.position} "
            f"qty={self.quantity} price={self.unit_price}>"
        )
