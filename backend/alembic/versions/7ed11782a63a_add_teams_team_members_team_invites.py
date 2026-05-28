"""add teams, team_members, team_invites

Revision ID: 7ed11782a63a
Revises: e3672b071350
Create Date: 2026-05-23 21:24:01.765685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision: str = '7ed11782a63a'
down_revision: Union[str, None] = 'e3672b071350'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'teams',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('owner_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('plan', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('plan_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('stripe_customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('stripe_subscription_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('plan_renews_at', sa.DateTime(), nullable=True),
        sa.Column('rfps_this_period', sa.Integer(), nullable=False),
        sa.Column('proposals_this_period', sa.Integer(), nullable=False),
        sa.Column('period_resets_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_teams_slug'), ['slug'], unique=True)
        batch_op.create_index(batch_op.f('ix_teams_stripe_customer_id'), ['stripe_customer_id'], unique=False)

    op.create_table(
        'team_invites',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('role', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('token', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('invited_by_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('team_invites', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_team_invites_email'), ['email'], unique=False)
        batch_op.create_index(batch_op.f('ix_team_invites_team_id'), ['team_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_team_invites_token'), ['token'], unique=True)

    op.create_table(
        'team_members',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('role', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('invited_by_user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('team_members', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_team_members_team_id'), ['team_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_team_members_user_id'), ['user_id'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
        batch_op.create_foreign_key('fk_users_current_team_id', 'teams', ['current_team_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_current_team_id', type_='foreignkey')
        batch_op.drop_column('current_team_id')

    with op.batch_alter_table('team_members', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_team_members_user_id'))
        batch_op.drop_index(batch_op.f('ix_team_members_team_id'))
    op.drop_table('team_members')

    with op.batch_alter_table('team_invites', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_team_invites_token'))
        batch_op.drop_index(batch_op.f('ix_team_invites_team_id'))
        batch_op.drop_index(batch_op.f('ix_team_invites_email'))
    op.drop_table('team_invites')

    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_teams_stripe_customer_id'))
        batch_op.drop_index(batch_op.f('ix_teams_slug'))
    op.drop_table('teams')
