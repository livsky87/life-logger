"""Replace date/hour/minute with timestamp TIMESTAMPTZ in schedules

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add timestamp column (nullable first for migration)
    op.add_column(
        "schedules",
        sa.Column("timestamp", TIMESTAMP(timezone=True), nullable=True),
    )

    # Reconstruct timestamp from date (YYYYMMDD INT) + hour + minute in Asia/Seoul timezone
    op.execute(
        """
        UPDATE schedules SET timestamp = (
            to_date(date::text, 'YYYYMMDD')
            + (hour * INTERVAL '1 hour')
            + (minute * INTERVAL '1 minute')
            + INTERVAL '9 hours'
        )::timestamptz
        """
    )

    # Make timestamp NOT NULL now that it has values
    op.alter_column("schedules", "timestamp", nullable=False)

    # Drop old columns
    op.drop_column("schedules", "date")
    op.drop_column("schedules", "hour")
    op.drop_column("schedules", "minute")

    # Index for efficient date-range queries
    op.create_index("ix_schedules_timestamp", "schedules", ["timestamp"])
    op.create_index("ix_schedules_user_timestamp", "schedules", ["user_id", "timestamp"])


def downgrade() -> None:
    op.drop_index("ix_schedules_user_timestamp", table_name="schedules")
    op.drop_index("ix_schedules_timestamp", table_name="schedules")

    op.add_column("schedules", sa.Column("date", sa.Integer(), nullable=True))
    op.add_column("schedules", sa.Column("hour", sa.SmallInteger(), nullable=True))
    op.add_column("schedules", sa.Column("minute", sa.SmallInteger(), nullable=True))

    op.execute(
        """
        UPDATE schedules SET
            date = to_char(timestamp AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD')::int,
            hour = EXTRACT(hour FROM timestamp AT TIME ZONE 'Asia/Seoul')::smallint,
            minute = EXTRACT(minute FROM timestamp AT TIME ZONE 'Asia/Seoul')::smallint
        """
    )

    op.alter_column("schedules", "date", nullable=False)
    op.alter_column("schedules", "hour", nullable=False)
    op.alter_column("schedules", "minute", nullable=False)

    op.drop_column("schedules", "timestamp")
