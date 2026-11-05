"""create_users_table

Revision ID: 0002_users
Revises: 0001_initial
Create Date: 2026-10-30

Phase 4 Step 1: Users table for authentication foundation.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_users"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, comment="Unique user login email"),
        sa.Column("hashed_password", sa.String(255), nullable=False, comment="Securely hashed password (bcrypt)"),
        sa.Column("full_name", sa.String(255), nullable=True, comment="User full or display name"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Active status flag"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

