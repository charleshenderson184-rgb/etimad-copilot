"""add activity_events

Revision ID: 1d044940c665
Revises: 5c2b87830457
Create Date: 2026-05-23 21:56:15.944750

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision: str = '1d044940c665'
down_revision: Union[str, None] = '5c2b87830457'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activity_events',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('actor_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('actor_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('actor_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('action', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('entity_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('entity_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('entity_label', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('extra', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('activity_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_activity_events_action'), ['action'], unique=False)
        batch_op.create_index(batch_op.f('ix_activity_events_actor_user_id'), ['actor_user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_activity_events_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_activity_events_entity_id'), ['entity_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_activity_events_entity_type'), ['entity_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_activity_events_team_id'), ['team_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('activity_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_activity_events_team_id'))
        batch_op.drop_index(batch_op.f('ix_activity_events_entity_type'))
        batch_op.drop_index(batch_op.f('ix_activity_events_entity_id'))
        batch_op.drop_index(batch_op.f('ix_activity_events_created_at'))
        batch_op.drop_index(batch_op.f('ix_activity_events_actor_user_id'))
        batch_op.drop_index(batch_op.f('ix_activity_events_action'))
    op.drop_table('activity_events')
