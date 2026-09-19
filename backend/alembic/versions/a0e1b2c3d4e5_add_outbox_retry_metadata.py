"""add outbox retry metadata

Revision ID: a0e1b2c3d4e5
Revises: d065b80bd055
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0e1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "d065b80bd055"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("event_outbox") as batch_op:
        batch_op.add_column(sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("last_error", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("event_outbox") as batch_op:
        batch_op.drop_column("last_error")
        batch_op.drop_column("retry_count")
