"""drop rbac permission tables

Revision ID: d678e9f0a123
Revises: d567e8f9a012
Create Date: 2026-05-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "d678e9f0a123"
down_revision: Union[str, None] = "d567e8f9a012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" in user_columns:
            op.execute(
                sa.text("UPDATE users SET role = 'teacher' WHERE role != 'teacher'")
            )

    if "role_permissions" in table_names:
        op.drop_table("role_permissions")

    if "roles" in table_names:
        op.drop_table("roles")

    if "permissions" in table_names:
        op.drop_table("permissions")


def downgrade() -> None:
    pass
