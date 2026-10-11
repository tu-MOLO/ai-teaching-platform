"""add iep and assessment tables

Revision ID: e12a3b4c5d67
Revises: 3739da71ac9a
Create Date: 2026-10-11 02:00:00.000000

新增个别化教育计划（IEP）与发展领域评估模板/快照相关 9 张表。
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e12a3b4c5d67"
down_revision: Union[str, None] = "3739da71ac9a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _common_columns() -> list[sa.Column]:
    """BaseModel 通用列"""
    return [
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    ]


def upgrade() -> None:
    # ---------- 评估模板 ----------
    op.create_table(
        "assessment_templates",
        *_common_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assessment_templates_user_id", "assessment_templates", ["user_id"]
    )

    op.create_table(
        "assessment_domains",
        *_common_columns(),
        sa.Column("template_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["template_id"], ["assessment_templates.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assessment_domains_template_id", "assessment_domains", ["template_id"]
    )

    op.create_table(
        "assessment_items",
        *_common_columns(),
        sa.Column("domain_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("level_anchors", sa.JSON(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["domain_id"], ["assessment_domains.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assessment_items_domain_id", "assessment_items", ["domain_id"]
    )

    # ---------- IEP 主体 ----------
    op.create_table(
        "iep_plans",
        *_common_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("term", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("revision_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("student_profile", sa.Text(), nullable=True),
        sa.Column("supports", sa.JSON(), nullable=True),
        sa.Column("evaluation_plan", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.String(length=36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["iep_plans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_iep_plans_user_id", "iep_plans", ["user_id"])
    op.create_index("ix_iep_plans_student_id", "iep_plans", ["student_id"])
    op.create_index("ix_iep_plans_term", "iep_plans", ["term"])
    op.create_index("ix_iep_plans_status", "iep_plans", ["status"])
    op.create_index("ix_iep_plans_parent_id", "iep_plans", ["parent_id"])

    op.create_table(
        "iep_domain_assessments",
        *_common_columns(),
        sa.Column("iep_id", sa.String(length=36), nullable=False),
        sa.Column("domain_code", sa.String(length=50), nullable=True),
        sa.Column("domain_name", sa.String(length=100), nullable=False),
        sa.Column("overall_level", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "overall_level IS NULL OR (overall_level >= 0 AND overall_level <= 3)",
            name="ck_iep_da_overall_level_range",
        ),
        sa.ForeignKeyConstraint(["iep_id"], ["iep_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_iep_domain_assessments_iep_id", "iep_domain_assessments", ["iep_id"]
    )

    op.create_table(
        "iep_assessment_snapshot_items",
        *_common_columns(),
        sa.Column("domain_assessment_id", sa.String(length=36), nullable=False),
        sa.Column("item_name", sa.String(length=200), nullable=False),
        sa.Column("level", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "level IS NULL OR (level >= 0 AND level <= 3)",
            name="ck_iep_snap_item_level_range",
        ),
        sa.ForeignKeyConstraint(
            ["domain_assessment_id"],
            ["iep_domain_assessments.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_iep_assessment_snapshot_items_domain_assessment_id",
        "iep_assessment_snapshot_items",
        ["domain_assessment_id"],
    )

    op.create_table(
        "iep_long_term_goals",
        *_common_columns(),
        sa.Column("iep_id", sa.String(length=36), nullable=False),
        sa.Column("domain_code", sa.String(length=50), nullable=True),
        sa.Column("domain_name", sa.String(length=100), nullable=True),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["iep_id"], ["iep_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_iep_long_term_goals_iep_id", "iep_long_term_goals", ["iep_id"]
    )

    op.create_table(
        "iep_short_term_goals",
        *_common_columns(),
        sa.Column("long_term_goal_id", sa.String(length=36), nullable=False),
        sa.Column("condition", sa.Text(), nullable=True),
        sa.Column("behavior", sa.Text(), nullable=False),
        sa.Column("criterion", sa.Text(), nullable=True),
        sa.Column("support_level", sa.Integer(), nullable=True),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="not_started"
        ),
        sa.Column("teaching_methods", sa.JSON(), nullable=True),
        sa.Column("materials", sa.JSON(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "support_level IS NULL OR (support_level >= 0 AND support_level <= 3)",
            name="ck_iep_stg_support_level_range",
        ),
        sa.ForeignKeyConstraint(
            ["long_term_goal_id"],
            ["iep_long_term_goals.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_iep_short_term_goals_long_term_goal_id",
        "iep_short_term_goals",
        ["long_term_goal_id"],
    )
    op.create_index(
        "ix_iep_short_term_goals_status", "iep_short_term_goals", ["status"]
    )

    op.create_table(
        "iep_generation_logs",
        *_common_columns(),
        sa.Column("iep_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("template_snapshot", sa.Text(), nullable=True),
        sa.Column("raw_output", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["iep_id"], ["iep_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_iep_generation_logs_iep_id", "iep_generation_logs", ["iep_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_iep_generation_logs_iep_id", table_name="iep_generation_logs")
    op.drop_table("iep_generation_logs")

    op.drop_index(
        "ix_iep_short_term_goals_status", table_name="iep_short_term_goals"
    )
    op.drop_index(
        "ix_iep_short_term_goals_long_term_goal_id", table_name="iep_short_term_goals"
    )
    op.drop_table("iep_short_term_goals")

    op.drop_index("ix_iep_long_term_goals_iep_id", table_name="iep_long_term_goals")
    op.drop_table("iep_long_term_goals")

    op.drop_index(
        "ix_iep_assessment_snapshot_items_domain_assessment_id",
        table_name="iep_assessment_snapshot_items",
    )
    op.drop_table("iep_assessment_snapshot_items")

    op.drop_index(
        "ix_iep_domain_assessments_iep_id", table_name="iep_domain_assessments"
    )
    op.drop_table("iep_domain_assessments")

    op.drop_index("ix_iep_plans_parent_id", table_name="iep_plans")
    op.drop_index("ix_iep_plans_status", table_name="iep_plans")
    op.drop_index("ix_iep_plans_term", table_name="iep_plans")
    op.drop_index("ix_iep_plans_student_id", table_name="iep_plans")
    op.drop_index("ix_iep_plans_user_id", table_name="iep_plans")
    op.drop_table("iep_plans")

    op.drop_index("ix_assessment_items_domain_id", table_name="assessment_items")
    op.drop_table("assessment_items")

    op.drop_index("ix_assessment_domains_template_id", table_name="assessment_domains")
    op.drop_table("assessment_domains")

    op.drop_index("ix_assessment_templates_user_id", table_name="assessment_templates")
    op.drop_table("assessment_templates")
