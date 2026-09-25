"""link applications to canonical job records

Revision ID: f2a1b7c9d4e6
Revises: a0e1b2c3d4e5
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a1b7c9d4e6"
down_revision: Union[str, Sequence[str], None] = "a0e1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("job_applications")}
    if "job_id" not in columns:
        with op.batch_alter_table("job_applications", schema=None) as batch_op:
            batch_op.add_column(sa.Column("job_id", sa.String(), nullable=True))
            batch_op.create_foreign_key(
                "fk_job_applications_job_id_jobs",
                "jobs",
                ["job_id"],
                ["id"],
                ondelete="SET NULL",
            )
            batch_op.create_index("ix_job_applications_job_id", ["job_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("job_applications", schema=None) as batch_op:
        batch_op.drop_index("ix_job_applications_job_id")
        batch_op.drop_constraint("fk_job_applications_job_id_jobs", type_="foreignkey")
        batch_op.drop_column("job_id")
