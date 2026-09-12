"""extend_user_profile

Revision ID: 124d080d546c
Revises: 06e519b97e2b
Create Date: 2026-07-31 13:12:29.875025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '124d080d546c'
down_revision: Union[str, Sequence[str], None] = '06e519b97e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Included in the reconstructed empty-database baseline.
    return
    # Resume Metadata (continued from partial failure)
    op.add_column('user_profiles', sa.Column('resume_version', sa.Integer(), nullable=True))
    op.add_column('user_profiles', sa.Column('resume_ats_score', sa.Integer(), nullable=True))
    op.add_column('user_profiles', sa.Column('resume_last_parsed', sa.DateTime(), nullable=True))

    # Portfolio Fields
    op.add_column('user_profiles', sa.Column('github_url', sa.String(512), nullable=True))
    op.add_column('user_profiles', sa.Column('linkedin_url', sa.String(512), nullable=True))
    op.add_column('user_profiles', sa.Column('portfolio_url', sa.String(512), nullable=True))
    op.add_column('user_profiles', sa.Column('leetcode_url', sa.String(512), nullable=True))
    op.add_column('user_profiles', sa.Column('hackerrank_url', sa.String(512), nullable=True))


def downgrade() -> None:
    return
    pass
