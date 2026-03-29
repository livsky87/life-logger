"""Add job to users, location_code to locations

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-29 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("job", sa.Text(), nullable=True))
    op.add_column("locations", sa.Column("location_code", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_locations_location_code", "locations", ["location_code"])


def downgrade() -> None:
    op.drop_constraint("uq_locations_location_code", "locations", type_="unique")
    op.drop_column("locations", "location_code")
    op.drop_column("users", "job")
