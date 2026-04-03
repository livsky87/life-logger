"""Add schedules and simulations tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schedules",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("date", sa.Integer(), nullable=False),
        sa.Column("hour", sa.SmallInteger(), nullable=False),
        sa.Column("minute", sa.SmallInteger(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("calls", JSONB(), nullable=False, server_default="[]"),
        sa.Column("location", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_home", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("metadata", JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.Text(), nullable=False, server_default="normal"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_schedules_date", "schedules", ["date"])
    op.create_index("idx_schedules_date_time", "schedules", ["date", "hour", "minute"])

    op.create_table(
        "simulations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("devices", JSONB(), nullable=False, server_default="[]"),
        sa.Column("metadata", JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_simulations_location_id", "simulations", ["location_id"])


def downgrade() -> None:
    op.drop_index("idx_simulations_location_id", table_name="simulations")
    op.drop_table("simulations")
    op.drop_index("idx_schedules_date_time", table_name="schedules")
    op.drop_index("idx_schedules_date", table_name="schedules")
    op.drop_table("schedules")
