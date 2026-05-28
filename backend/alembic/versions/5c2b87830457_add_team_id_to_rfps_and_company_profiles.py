"""add team_id to rfps and company_profiles, backfill from owner

Revision ID: 5c2b87830457
Revises: 7ed11782a63a
Create Date: 2026-05-23 21:40:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision: str = '5c2b87830457'
down_revision: Union[str, None] = '7ed11782a63a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add team_id columns (nullable for backfill)
    with op.batch_alter_table('rfps', schema=None) as batch_op:
        batch_op.add_column(sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
        batch_op.create_index(batch_op.f('ix_rfps_team_id'), ['team_id'], unique=False)
        batch_op.create_foreign_key('fk_rfps_team_id', 'teams', ['team_id'], ['id'])

    with op.batch_alter_table('company_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('team_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
        batch_op.create_index(batch_op.f('ix_company_profiles_team_id'), ['team_id'], unique=True)
        batch_op.create_foreign_key('fk_company_profiles_team_id', 'teams', ['team_id'], ['id'])

    # 2. Backfill: for every distinct user_id that owns an RFP or CompanyProfile but has
    #    no personal team yet, create one. Then set team_id on those rows.
    bind = op.get_bind()
    now = datetime.now(timezone.utc).isoformat()

    owners = bind.execute(sa.text(
        """
        SELECT DISTINCT user_id FROM (
            SELECT user_id FROM rfps WHERE user_id IS NOT NULL
            UNION
            SELECT user_id FROM company_profiles WHERE user_id IS NOT NULL
        )
        """
    )).fetchall()

    for (user_id,) in owners:
        team_row = bind.execute(
            sa.text("SELECT id FROM teams WHERE owner_user_id = :uid LIMIT 1"),
            {"uid": user_id},
        ).fetchone()
        if team_row:
            team_id = team_row[0]
        else:
            user_row = bind.execute(
                sa.text("SELECT email, name, plan, plan_status FROM users WHERE id = :uid"),
                {"uid": user_id},
            ).fetchone()
            if not user_row:
                continue
            email, name, plan, plan_status = user_row
            team_id = str(uuid.uuid4())
            display = (name or (email.split("@")[0] if email else "workspace")) + "'s workspace"
            slug_base = (email.split("@")[0] if email else "team") + "-" + team_id[:8]
            bind.execute(
                sa.text(
                    """
                    INSERT INTO teams (id, name, slug, owner_user_id, plan, plan_status,
                                       rfps_this_period, proposals_this_period, created_at)
                    VALUES (:id, :name, :slug, :owner, :plan, :plan_status, 0, 0, :created_at)
                    """
                ),
                {
                    "id": team_id,
                    "name": display,
                    "slug": slug_base,
                    "owner": user_id,
                    "plan": plan or "trial",
                    "plan_status": plan_status or "trialing",
                    "created_at": now,
                },
            )
            bind.execute(
                sa.text(
                    """
                    INSERT INTO team_members (id, team_id, user_id, role, joined_at)
                    VALUES (:id, :team_id, :user_id, 'owner', :joined_at)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "team_id": team_id,
                    "user_id": user_id,
                    "joined_at": now,
                },
            )
            bind.execute(
                sa.text("UPDATE users SET current_team_id = :tid WHERE id = :uid AND current_team_id IS NULL"),
                {"tid": team_id, "uid": user_id},
            )

        bind.execute(
            sa.text("UPDATE rfps SET team_id = :tid WHERE user_id = :uid AND team_id IS NULL"),
            {"tid": team_id, "uid": user_id},
        )
        bind.execute(
            sa.text("UPDATE company_profiles SET team_id = :tid WHERE user_id = :uid AND team_id IS NULL"),
            {"tid": team_id, "uid": user_id},
        )


def downgrade() -> None:
    with op.batch_alter_table('company_profiles', schema=None) as batch_op:
        batch_op.drop_constraint('fk_company_profiles_team_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_company_profiles_team_id'))
        batch_op.drop_column('team_id')

    with op.batch_alter_table('rfps', schema=None) as batch_op:
        batch_op.drop_constraint('fk_rfps_team_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_rfps_team_id'))
        batch_op.drop_column('team_id')
