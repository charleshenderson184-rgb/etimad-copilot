"""add comments and notifications

Revision ID: 204ed108a8af
Revises: 1d044940c665
Create Date: 2026-05-23 22:05:21.813019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision: str = '204ed108a8af'
down_revision: Union[str, None] = '1d044940c665'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'comments',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('author_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('target_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('target_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('body', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_comments_author_user_id'), ['author_user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_comments_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_comments_target_id'), ['target_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_comments_target_type'), ['target_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_comments_team_id'), ['team_id'], unique=False)

    op.create_table(
        'notifications',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('kind', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('body', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('link_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('actor_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('actor_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('actor_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('source_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('source_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_kind'), ['kind'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_read_at'), ['read_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_team_id'), ['team_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_user_id'), ['user_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_user_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_team_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_read_at'))
        batch_op.drop_index(batch_op.f('ix_notifications_kind'))
        batch_op.drop_index(batch_op.f('ix_notifications_created_at'))
    op.drop_table('notifications')
    with op.batch_alter_table('comments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_comments_team_id'))
        batch_op.drop_index(batch_op.f('ix_comments_target_type'))
        batch_op.drop_index(batch_op.f('ix_comments_target_id'))
        batch_op.drop_index(batch_op.f('ix_comments_created_at'))
        batch_op.drop_index(batch_op.f('ix_comments_author_user_id'))
    op.drop_table('comments')
