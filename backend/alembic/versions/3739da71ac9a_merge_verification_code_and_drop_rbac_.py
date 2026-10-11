"""merge verification_code and drop_rbac branches

Revision ID: 3739da71ac9a
Revises: c543b2a1d678, d678e9f0a123
Create Date: 2026-10-11 01:56:27.737711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3739da71ac9a'
down_revision: Union[str, None] = ('c543b2a1d678', 'd678e9f0a123')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
