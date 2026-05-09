"""add partial unique indexes

Revision ID: d456e7f8a901
Revises: c345d6e7f890
Create Date: 2026-05-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd456e7f8a901'
down_revision = 'c345d6e7f890'
branch_labels = None
depends_on = None


def _get_existing_indexes(bind, table_name):
    result = bind.execute(sa.text(f"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='{table_name}'"))
    return {row[0] for row in result}


def _is_postgresql():
    bind = op.get_bind()
    return bind.dialect.name == 'postgresql'


def upgrade() -> None:
    bind = op.get_bind()

    tags_indexes = _get_existing_indexes(bind, 'tags')
    users_indexes = _get_existing_indexes(bind, 'users')

    if _is_postgresql():
        if 'ix_tags_name' in tags_indexes:
            op.drop_index('ix_tags_name', table_name='tags')
        op.create_index('ix_tags_name_unique', 'tags', ['name'], unique=True, postgresql_where=sa.text('is_deleted = false'))

        if 'ix_users_email' in users_indexes:
            op.drop_index('ix_users_email', table_name='users')
        if 'ix_users_username' in users_indexes:
            op.drop_index('ix_users_username', table_name='users')
        op.create_index('ix_users_email_unique', 'users', ['email'], unique=True, postgresql_where=sa.text('is_deleted = false'))
        op.create_index('ix_users_username_unique', 'users', ['username'], unique=True, postgresql_where=sa.text('is_deleted = false'))
    else:
        if 'ix_tags_name' in tags_indexes:
            op.drop_index('ix_tags_name', table_name='tags')
        op.create_index('ix_tags_name_unique', 'tags', ['name'], unique=True)

        if 'ix_users_email' in users_indexes:
            op.drop_index('ix_users_email', table_name='users')
        if 'ix_users_username' in users_indexes:
            op.drop_index('ix_users_username', table_name='users')
        op.create_index('ix_users_email_unique', 'users', ['email'], unique=True)
        op.create_index('ix_users_username_unique', 'users', ['username'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index('ix_tags_name_unique', table_name='tags')
    op.create_index('ix_tags_name', 'tags', ['name'], unique=True)

    op.drop_index('ix_users_email_unique', table_name='users')
    op.drop_index('ix_users_username_unique', table_name='users')
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
