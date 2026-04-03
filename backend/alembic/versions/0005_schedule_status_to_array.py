"""Change schedule status from text to jsonb array

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-02 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Must drop the old TEXT default before changing type
    op.execute("ALTER TABLE schedules ALTER COLUMN status DROP DEFAULT")
    op.execute(
        """
        ALTER TABLE schedules
        ALTER COLUMN status TYPE JSONB
        USING (
            CASE
                WHEN status IS NULL OR status = ''
                    THEN '[]'::jsonb
                WHEN status IN ('normal', 'warning', 'error')
                    THEN '[]'::jsonb
                ELSE json_build_array(status)::jsonb
            END
        )
        """
    )
    op.execute("ALTER TABLE schedules ALTER COLUMN status SET DEFAULT '[]'::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE schedules ALTER COLUMN status DROP DEFAULT")
    op.execute(
        """
        ALTER TABLE schedules
        ALTER COLUMN status TYPE TEXT
        USING (
            CASE
                WHEN jsonb_array_length(status) > 0
                    THEN status->>0
                ELSE 'normal'
            END
        )
        """
    )
    op.execute("ALTER TABLE schedules ALTER COLUMN status SET DEFAULT 'normal'")
