"""add verification_code table

Revision ID: c543b2a1d678
Revises: f890a1b2c345
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c543b2a1d678'
down_revision = 'f890a1b2c345'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'verification_codes',
        sa.Column('id', sa.String(36), nullable=False, comment='唯一标识符'),
        sa.Column('email', sa.String(255), nullable=False, comment='邮箱地址'),
        sa.Column('code', sa.String(10), nullable=False, comment='验证码'),
        sa.Column('type', sa.String(50), nullable=False, comment='验证码类型'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, comment='过期时间'),
        sa.Column('used', sa.Boolean(), nullable=False, comment='是否已使用'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
            comment='创建时间',
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
            comment='更新时间',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_verification_codes_email'), 'verification_codes', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_verification_codes_email'), table_name='verification_codes')
    op.drop_table('verification_codes')
