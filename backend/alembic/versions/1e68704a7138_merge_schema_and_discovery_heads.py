"""merge schema and discovery heads

Revision ID: 1e68704a7138
Revises: 6297327ece39, c1f938a29b4e
Create Date: 2026-09-12 11:45:40.765467

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e68704a7138'
down_revision: Union[str, Sequence[str], None] = ('6297327ece39', 'c1f938a29b4e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
