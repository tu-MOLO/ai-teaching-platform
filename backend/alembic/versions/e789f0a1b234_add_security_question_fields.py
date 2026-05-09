"""add security question fields

Revision ID: e789f0a1b234
Revises: d456e7f8a901
Create Date: 2026-05-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e789f0a1b234'
down_revision = 'd456e7f8a901'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('security_question', sa.String(200), nullable=True, comment='密保问题'))
    op.add_column('users', sa.Column('hashed_security_answer', sa.String(255), nullable=True, comment='哈希后的密保答案'))
    op.add_column('users', sa.Column('failed_reset_attempts', sa.Integer(), nullable=False, server_default='0', comment='密码重置连续失败次数'))
    op.add_column('users', sa.Column('reset_locked_until', sa.DateTime(timezone=True), nullable=True, comment='密码重置锁定截止时间'))

    default_hashed_answer = '$2b$12$izB8uqxQiHvqGqrhcRrVZ.ndqO28Lxd0Rm.8ytocGDm5nFMYxw53O'

    users_table = sa.table(
        'users',
        sa.column('security_question', sa.String),
        sa.column('hashed_security_answer', sa.String),
    )
    op.execute(
        users_table.update()
        .where(users_table.c.security_question == None)
        .values(security_question='未设置密保问题', hashed_security_answer=default_hashed_answer)
    )

    op.alter_column('users', 'security_question', nullable=False)
    op.alter_column('users', 'hashed_security_answer', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'reset_locked_until')
    op.drop_column('users', 'failed_reset_attempts')
    op.drop_column('users', 'hashed_security_answer')
    op.drop_column('users', 'security_question')
