"""course multi grade and class names

将课程「年级」由单值字符串改为多选 JSON 数组，并新增「班级」多选字段。

Revision ID: f1a2b3c4d5e6
Revises: e12a3b4c5d67
Create Date: 2026-10-14 16:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e12a3b4c5d67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "courses" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("courses")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("courses")}

    if "grades" not in existing_columns or "class_names" not in existing_columns:
        with op.batch_alter_table("courses", schema=None) as batch_op:
            if "grades" not in existing_columns:
                batch_op.add_column(
                    sa.Column(
                        "grades",
                        sa.JSON(),
                        nullable=False,
                        server_default=sa.text("'[]'"),
                        comment="年级（支持多选）",
                    )
                )
            if "class_names" not in existing_columns:
                batch_op.add_column(
                    sa.Column(
                        "class_names",
                        sa.JSON(),
                        nullable=False,
                        server_default=sa.text("'[]'"),
                        comment="班级（支持多选）",
                    )
                )

    # 迁移既有单值年级数据到数组
    if "grade" in existing_columns:
        op.execute("UPDATE courses SET grades = json_array(grade) WHERE grade IS NOT NULL")

    with op.batch_alter_table("courses", schema=None) as batch_op:
        if "ix_courses_grade" in existing_indexes:
            batch_op.drop_index("ix_courses_grade")
        if "ix_courses_subject_grade" in existing_indexes:
            batch_op.drop_index("ix_courses_subject_grade")
        if "grade" in existing_columns:
            batch_op.drop_column("grade")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "courses" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("courses")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("courses")}

    if "grade" not in existing_columns:
        with op.batch_alter_table("courses", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("grade", sa.String(length=50), nullable=False, server_default="")
            )

    if "grades" in existing_columns:
        op.execute(
            "UPDATE courses SET grade = COALESCE(json_extract(grades, '$[0]'), '')"
            " WHERE grades IS NOT NULL"
        )

    with op.batch_alter_table("courses", schema=None) as batch_op:
        if "ix_courses_grade" not in existing_indexes:
            batch_op.create_index("ix_courses_grade", ["grade"], unique=False)
        if "ix_courses_subject_grade" not in existing_indexes:
            batch_op.create_index("ix_courses_subject_grade", ["subject", "grade"], unique=False)
        if "grades" in existing_columns:
            batch_op.drop_column("grades")
        if "class_names" in existing_columns:
            batch_op.drop_column("class_names")
