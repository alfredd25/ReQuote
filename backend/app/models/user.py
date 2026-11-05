"""
user.py – User SQLAlchemy model.

Design notes:
- Unique, indexed email address for identification & login.
- Password stored exclusively as a bcrypt hash (never plaintext).
- UUID primary key using new_uuid.
- Server-side created_at / updated_at timestamps via TimestampMixin.
"""

from typing import TYPE_CHECKING
import uuid

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.quotation import Quotation


class User(TimestampMixin, Base):
    """
    Application user account.
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )

    # ── Primary key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=new_uuid,
    )

    # ── Credentials & identity ───────────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Unique user login email",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Securely hashed password (bcrypt)",
    )
    full_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="User full or display name",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Active status flag",
    )

    # ── Relationships ────────────────────────────────────────────────────────
    quotations: Mapped[list["Quotation"]] = relationship(
        "Quotation",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Quotation.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"

