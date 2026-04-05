"""Location residence fields and user profile (age, gender, personality, daily_style)

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("locations", sa.Column("residence_city", sa.Text(), nullable=True))
    op.add_column("locations", sa.Column("residence_type", sa.Text(), nullable=True))
    op.add_column("locations", sa.Column("country", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("personality", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("daily_style", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "daily_style")
    op.drop_column("users", "personality")
    op.drop_column("users", "gender")
    op.drop_column("users", "age")
    op.drop_column("locations", "country")
    op.drop_column("locations", "residence_type")
    op.drop_column("locations", "residence_city")
