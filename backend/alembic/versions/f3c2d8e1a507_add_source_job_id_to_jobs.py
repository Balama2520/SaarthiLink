"""add source job identity to job postings

Revision ID: f3c2d8e1a507
Revises: f2a1b7c9d4e6
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3c2d8e1a507"
down_revision: Union[str, Sequence[str], None] = "f2a1b7c9d4e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("jobs")}
    if "source_job_id" not in columns:
        with op.batch_alter_table("jobs", schema=None) as batch_op:
            batch_op.add_column(sa.Column("source_job_id", sa.String(length=255), nullable=True))
            batch_op.create_index("ix_jobs_source_job_id", ["source_job_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.drop_index("ix_jobs_source_job_id")
        batch_op.drop_column("source_job_id")
