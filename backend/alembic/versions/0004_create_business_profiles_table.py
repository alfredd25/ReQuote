"""create_business_profiles_table

Revision ID: 0004_create_business_profiles
Revises: 0003_quotation_user_ownership
Create Date: 2026-11-06

Phase 8: Business Profile & Settings.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_create_business_profiles"
down_revision: Union[str, None] = "0003_quotation_user_ownership"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "business_profiles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            comment="Primary key UUID",
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_business_profiles_user_id"),
            nullable=False,
            comment="Owner user account ID",
        ),
        sa.Column(
            "business_name",
            sa.String(length=255),
            nullable=True,
            comment="Registered company or freelancer business name",
        ),
        sa.Column(
            "contact_person",
            sa.String(length=255),
            nullable=True,
            comment="Primary contact or representative name",
        ),
        sa.Column(
            "email",
            sa.String(length=255),
            nullable=True,
            comment="Public business billing or contact email",
        ),
        sa.Column(
            "phone",
            sa.String(length=50),
            nullable=True,
            comment="Business telephone number",
        ),
        sa.Column(
            "address",
            sa.Text(),
            nullable=True,
            comment="Full business mailing address",
        ),
        sa.Column(
            "website",
            sa.String(length=255),
            nullable=True,
            comment="Company website URL",
        ),
        sa.Column(
            "logo_url",
            sa.Text(),
            nullable=True,
            comment="URL pointing to company logo image",
        ),
        sa.Column(
            "tax_id",
            sa.String(length=100),
            nullable=True,
            comment="Tax ID, VAT registration number, or EIN",
        ),
        sa.Column(
            "default_currency",
            sa.String(length=3),
            server_default="USD",
            nullable=False,
            comment="Default ISO 4217 currency code",
        ),
        sa.Column(
            "default_notes",
            sa.Text(),
            nullable=True,
            comment="Default boilerplate notes for new quotations",
        ),
        sa.Column(
            "default_terms",
            sa.Text(),
            nullable=True,
            comment="Default terms & conditions for new quotations",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
            comment="Creation timestamp",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
            comment="Last update timestamp",
        ),
        sa.UniqueConstraint("user_id", name="uq_business_profiles_user_id"),
    )
    op.create_index(
        "ix_business_profiles_user_id",
        "business_profiles",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_business_profiles_user_id", table_name="business_profiles")
    op.drop_table("business_profiles")

