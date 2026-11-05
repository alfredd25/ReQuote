"""add_user_id_to_quotations

Revision ID: 0003_quotation_user_ownership
Revises: 0002_users
Create Date: 2026-11-05

Phase 4 Step 2: Add user ownership relationship to quotations.
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_quotation_user_ownership"
down_revision: Union[str, None] = "0002_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add user_id column as nullable initially
    op.add_column(
        "quotations",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="Owner user account ID",
        ),
    )

    # 2. Establish foreign key constraint and index
    op.create_foreign_key(
        "fk_quotations_user_id_users",
        "quotations",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_quotations_user_id",
        "quotations",
        ["user_id"],
        unique=False,
    )

    # 3. Check for existing legacy unassigned quotations before enforcing NOT NULL.
    # In live databases with existing quotation records, we do NOT silently reassign
    # records to arbitrary users or delete data without administrator confirmation.
    if not context.is_offline_mode():
        bind = op.get_bind()
        unassigned_count = bind.execute(
            sa.text("SELECT COUNT(*) FROM quotations WHERE user_id IS NULL")
        ).scalar()
        if unassigned_count and unassigned_count > 0:
            raise RuntimeError(
                f"Cannot enforce NOT NULL on quotations.user_id: found {unassigned_count} existing quotation(s) without an owner.\n"
                "To safely proceed without data loss or ambiguous assignment, please select a backfill option:\n"
                "  Option A: Assign existing quotations to a designated administrator/legacy user ID:\n"
                "            UPDATE quotations SET user_id = '<USER_UUID>' WHERE user_id IS NULL;\n"
                "  Option B: If these are test records that can be safely discarded:\n"
                "            DELETE FROM quotations WHERE user_id IS NULL;\n"
                "After backfilling, re-run 'alembic upgrade head'."
            )

    # 4. Enforce NOT NULL constraint
    op.alter_column("quotations", "user_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_quotations_user_id_users", "quotations", type_="foreignkey")
    op.drop_index("ix_quotations_user_id", table_name="quotations")
    op.drop_column("quotations", "user_id")

