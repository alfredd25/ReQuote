"""
business_profile.py – BusinessProfile SQLAlchemy model.

Stores business contact details, branding (logo URL), tax/VAT registration,
and default quotation terms for each authenticated user.
"""

from typing import TYPE_CHECKING
import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.user import User


class BusinessProfile(TimestampMixin, Base):
    """
    Business Profile & Settings for a user.
    Each user has at most one BusinessProfile (1-to-1).
    """

    __tablename__ = "business_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_business_profiles_user_id"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=new_uuid,
    )

    # ── User ownership (1-to-1) ──────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_business_profiles_user_id"),
        nullable=False,
        unique=True,
        index=True,
        comment="Owner user account ID",
    )

    # ── Business Details ─────────────────────────────────────────────────────
    business_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Registered company or freelancer business name",
    )
    contact_person: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Primary contact or representative name",
    )
    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Public business billing or contact email",
    )
    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Business telephone number",
    )
    address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Full business mailing address",
    )
    website: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Company website URL",
    )
    logo_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="URL pointing to company logo image",
    )
    tax_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Tax ID, VAT registration number, or EIN",
    )
    default_currency: Mapped[str] = mapped_column(
        String(3),
        default="USD",
        nullable=False,
        comment="Default ISO 4217 currency code",
    )
    default_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Default boilerplate notes for new quotations",
    )
    default_terms: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Default terms & conditions for new quotations",
    )

    # ── Relationships ────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(
        "User",
        back_populates="business_profile",
    )

    def __repr__(self) -> str:
        return f"<BusinessProfile id={self.id} user_id={self.user_id} name={self.business_name!r}>"

