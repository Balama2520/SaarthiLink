"""add persisted user roles and case-insensitive username uniqueness

Revision ID: 6a8f2c1d9e34
Revises: f3c2d8e1a507
Create Date: 2026-10-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6a8f2c1d9e34"
down_revision: Union[str, Sequence[str], None] = "f3c2d8e1a507"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "role" not in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "role",
                    sa.String(length=20),
                    nullable=False,
                    server_default="user",
                )
            )

    duplicate_groups = bind.execute(
        sa.text(
            "SELECT COUNT(*) FROM ("
            "SELECT lower(username) FROM users "
            "GROUP BY lower(username) HAVING COUNT(*) > 1"
            ") AS duplicate_usernames"
        )
    ).scalar_one()
    if duplicate_groups:
        raise RuntimeError(
            f"Cannot create case-insensitive username index: "
            f"{duplicate_groups} duplicate username group(s) need operator cleanup."
        )

    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower "
            "ON users (lower(username))"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.execute(sa.text("DROP INDEX IF EXISTS uq_users_username_lower"))

    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "role" in columns:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column("role")
