"""normalize legacy admin roles to teacher

Revision ID: c345d6e7f890
Revises: b234c5e6f789
Create Date: 2026-05-05 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "c345d6e7f890"
down_revision: Union[str, None] = "b234c5e6f789"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "role" in user_columns:
            bind.execute(
                sa.text(
                    """
                    UPDATE users
                    SET role = :teacher_role
                    WHERE role = :admin_role_upper OR role = :admin_role_lower
                    """
                ),
                {
                    "teacher_role": "teacher",
                    "admin_role_upper": "ADMIN",
                    "admin_role_lower": "admin",
                },
            )

    if "roles" in table_names:
        role_columns = {column["name"] for column in inspector.get_columns("roles")}
        if {"code", "is_active"}.issubset(role_columns):
            update_sql = """
                UPDATE roles
                SET code = :legacy_code,
                    is_active = :inactive_value
            """

            if "name" in role_columns:
                update_sql += ", name = :legacy_name"
            if "description" in role_columns:
                update_sql += ", description = :legacy_description"
            if "is_deleted" in role_columns:
                update_sql += ", is_deleted = :deleted_value"
            if "deleted_at" in role_columns:
                update_sql += ", deleted_at = CURRENT_TIMESTAMP"
            if "updated_at" in role_columns:
                update_sql += ", updated_at = CURRENT_TIMESTAMP"

            update_sql += " WHERE code = :admin_code_lower OR code = :admin_code_upper"

            bind.execute(
                sa.text(update_sql),
                {
                    "legacy_code": "admin_legacy",
                    "inactive_value": False,
                    "legacy_name": "Legacy Admin",
                    "legacy_description": "Deprecated admin role retained only for historical compatibility.",
                    "deleted_value": True,
                    "admin_code_lower": "admin",
                    "admin_code_upper": "ADMIN",
                },
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "roles" in table_names:
        role_columns = {column["name"] for column in inspector.get_columns("roles")}
        if {"code", "is_active"}.issubset(role_columns):
            update_sql = """
                UPDATE roles
                SET code = :admin_code,
                    is_active = :active_value
            """

            if "name" in role_columns:
                update_sql += ", name = :admin_name"
            if "description" in role_columns:
                update_sql += ", description = :admin_description"
            if "is_deleted" in role_columns:
                update_sql += ", is_deleted = :deleted_value"
            if "deleted_at" in role_columns:
                update_sql += ", deleted_at = NULL"
            if "updated_at" in role_columns:
                update_sql += ", updated_at = CURRENT_TIMESTAMP"

            update_sql += " WHERE code = :legacy_code"

            bind.execute(
                sa.text(update_sql),
                {
                    "admin_code": "admin",
                    "active_value": True,
                    "admin_name": "Admin",
                    "admin_description": "Administrator role restored by downgrade.",
                    "deleted_value": False,
                    "legacy_code": "admin_legacy",
                },
            )
