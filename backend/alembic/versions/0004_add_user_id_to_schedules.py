"""Add user_id to schedules table

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "schedules",
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_schedules_user_id", "schedules", ["user_id"])
    op.create_index("ix_schedules_user_date", "schedules", ["user_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_schedules_user_date", table_name="schedules")
    op.drop_index("ix_schedules_user_id", table_name="schedules")
    op.drop_column("schedules", "user_id")
