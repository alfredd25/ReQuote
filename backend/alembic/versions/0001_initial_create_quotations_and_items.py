"""create_quotations_and_items

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-29

Initial schema for Phase 2: Quotation and QuotationItem tables.
"""

from typing import Sequence, Union
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── quotations ────────────────────────────────────────────────────────────
    op.create_table(
        "quotations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quotation_number", sa.String(32), nullable=False,
                  comment="Human-readable identifier, e.g. RQ-2024-0001"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False,
                  comment="QuotationStatus enum value"),
        # Customer details
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=True),
        sa.Column("customer_phone", sa.String(50), nullable=True),
        sa.Column("customer_company", sa.String(255), nullable=True),
        sa.Column("customer_address", sa.Text(), nullable=True),
        # Monetary
        sa.Column("currency", sa.String(3), nullable=False,
                  comment="ISO 4217 currency code"),
        sa.Column("subtotal", sa.Numeric(12, 4), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 4), nullable=False,
                  comment="Fractional rate, e.g. 0.1000 = 10 %"),
        sa.Column("tax_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 4), nullable=False,
                  comment="subtotal + tax_amount"),
        # Notes
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("terms_and_conditions", sa.Text(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quotation_number", name="uq_quotation_number"),
        sa.CheckConstraint("subtotal >= 0", name="ck_quotation_subtotal_non_negative"),
        sa.CheckConstraint("tax_amount >= 0", name="ck_quotation_tax_non_negative"),
        sa.CheckConstraint("total_amount >= 0", name="ck_quotation_total_non_negative"),
    )

    # ── quotation_items ───────────────────────────────────────────────────────
    op.create_table(
        "quotation_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quotation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False,
                  comment="Display order within the quotation"),
        sa.Column("description", sa.Text(), nullable=False,
                  comment="What is being quoted for this line"),
        sa.Column("unit", sa.String(50), nullable=True,
                  comment="Unit of measure, e.g. 'hour', 'piece', 'kg'"),
        # Monetary
        sa.Column("quantity", sa.Numeric(10, 4), nullable=False,
                  comment="Supports fractional quantities"),
        sa.Column("unit_price", sa.Numeric(12, 4), nullable=False,
                  comment="Price per unit in the parent quotation's currency"),
        sa.Column("line_total", sa.Numeric(12, 4), nullable=False,
                  comment="quantity × unit_price, stored for historical accuracy"),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["quotation_id"], ["quotations.id"],
            ondelete="CASCADE",
        ),
        sa.CheckConstraint("quantity > 0", name="ck_item_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_item_unit_price_non_negative"),
        sa.CheckConstraint("line_total >= 0", name="ck_item_line_total_non_negative"),
        sa.CheckConstraint("position >= 1", name="ck_item_position_positive"),
    )
    op.create_index("ix_quotation_items_quotation_id", "quotation_items",
                    ["quotation_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_quotation_items_quotation_id", table_name="quotation_items")
    op.drop_table("quotation_items")
    op.drop_table("quotations")
