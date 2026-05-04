"""align legacy student user_id and course status

Revision ID: b234c5e6f789
Revises: a6187dbdd1d8
Create Date: 2026-04-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "b234c5e6f789"
down_revision: Union[str, None] = "a6187dbdd1d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "students" in inspector.get_table_names():
        student_columns = {column["name"]: column for column in inspector.get_columns("students")}
        user_id_column = student_columns.get("user_id")
        if user_id_column is not None and not isinstance(user_id_column["type"], sa.String):
            with op.batch_alter_table("students", schema=None) as batch_op:
                batch_op.alter_column(
                    "user_id",
                    existing_type=user_id_column["type"],
                    type_=sa.String(36),
                    existing_nullable=True,
                )

    if "courses" in inspector.get_table_names():
        check_constraints = {constraint["name"] for constraint in inspector.get_check_constraints("courses")}
        if "courses_status_check" not in check_constraints:
            op.create_check_constraint(
                "courses_status_check",
                "courses",
                "status IN ('ACTIVE', 'INACTIVE', 'DRAFT', 'active', 'inactive', 'draft')",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "courses" in inspector.get_table_names():
        check_constraints = {constraint["name"] for constraint in inspector.get_check_constraints("courses")}
        if "courses_status_check" in check_constraints:
            op.drop_constraint("courses_status_check", "courses", type_="check")
