"""Team workspace + RBAC.

Endpoints
    GET    /api/teams/current              — full info on the current user's team
    GET    /api/teams/current/members      — list members
    POST   /api/teams/current/invites      — invite by email
    GET    /api/teams/current/invites      — list pending invites
    DELETE /api/teams/current/invites/{id} — revoke
    POST   /api/teams/invites/accept       — accept by token (any user)
    PATCH  /api/teams/current/members/{user_id} — change a member's role
    DELETE /api/teams/current/members/{user_id} — remove a member

Roles
    owner   — billing + delete-team rights (one per team)
    admin   — invite/remove members, change roles (except owner)
    editor  — full read/write on resources
    viewer  — read-only

A user always has at least one team — their personal team, auto-created on first login.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from sqlmodel import Session, create_engine, select

from .auth import CurrentUser
from .config import settings
from .models import (
    Team,
    TeamInvite,
    TeamInviteCreate,
    TeamInviteResponse,
    TeamMember,
    TeamMemberResponse,
    TeamResponse,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/teams", tags=["teams"])
_engine = create_engine(settings.database_url, echo=False)


ROLE_ORDER = {"viewer": 0, "editor": 1, "admin": 2, "owner": 3}


def _slugify(s: str) -> str:
    out = "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")
    return out[:48] or "team"


def _ensure_personal_team(session: Session, user: User) -> Team:
    """Lazily create a personal team for users who don't have one yet."""
    if user.current_team_id:
        team = session.get(Team, user.current_team_id)
        if team:
            return team

    base_slug = _slugify(user.name or user.email.split("@")[0])
    slug = base_slug
    suffix = 1
    while session.exec(select(Team).where(Team.slug == slug)).first() is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    from datetime import datetime as _dt
    team = Team(
        name=(user.company_name or f"{user.name or user.email.split('@')[0]}'s workspace"),
        slug=slug,
        owner_user_id=user.id,
        plan=user.plan,
        plan_status=user.plan_status,
        trial_ends_at=user.trial_ends_at,
        plan_renews_at=user.plan_renews_at,
        stripe_customer_id=user.stripe_customer_id,
        stripe_subscription_id=user.stripe_subscription_id,
        rfps_this_period=user.rfps_this_period,
        proposals_this_period=user.proposals_this_period,
        period_resets_at=user.period_resets_at,
        created_at=user.created_at or _dt.now(timezone.utc),
    )
    session.add(team)
    session.commit()
    session.refresh(team)

    # Membership row
    membership = TeamMember(
        team_id=team.id,
        user_id=user.id,
        role="owner",
    )
    session.add(membership)

    # Link user to team
    user.current_team_id = team.id
    session.add(user)
    session.commit()
    session.refresh(team)
    return team


def _get_membership(session: Session, team: Team, user: User) -> Optional[TeamMember]:
    return session.exec(
        select(TeamMember)
        .where(TeamMember.team_id == team.id)
        .where(TeamMember.user_id == user.id)
    ).first()


def _require_role(membership: Optional[TeamMember], min_role: str):
    if not membership:
        raise HTTPException(status_code=403, detail="Not a team member")
    if ROLE_ORDER.get(membership.role, -1) < ROLE_ORDER[min_role]:
        raise HTTPException(
            status_code=403,
            detail=f"Requires '{min_role}' role or higher (you have '{membership.role}')",
        )


def _team_to_response(session: Session, team: Team) -> TeamResponse:
    members = session.exec(
        select(TeamMember).where(TeamMember.team_id == team.id)
    ).all()
    invites = session.exec(
        select(TeamInvite)
        .where(TeamInvite.team_id == team.id)
        .where(TeamInvite.accepted_at.is_(None))
        .where(TeamInvite.revoked_at.is_(None))
    ).all()
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        owner_user_id=team.owner_user_id,
        plan=team.plan,
        plan_status=team.plan_status,
        trial_ends_at=team.trial_ends_at,
        plan_renews_at=team.plan_renews_at,
        rfps_this_period=team.rfps_this_period,
        proposals_this_period=team.proposals_this_period,
        member_count=len(members),
        pending_invites=len(invites),
        created_at=team.created_at,
    )


# ─── Endpoints ───────────────────────────────────────────

@router.get("/current", response_model=TeamResponse)
async def get_current_team(user: User = CurrentUser):
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        return _team_to_response(session, team)


@router.get("/current/members", response_model=list[TeamMemberResponse])
async def list_members(user: User = CurrentUser):
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        members = session.exec(
            select(TeamMember).where(TeamMember.team_id == team.id)
        ).all()
        out: list[TeamMemberResponse] = []
        for m in members:
            u = session.get(User, m.user_id)
            if not u:
                continue
            out.append(
                TeamMemberResponse(
                    id=m.id,
                    user_id=u.id,
                    email=u.email,
                    name=u.name,
                    role=m.role,
                    joined_at=m.joined_at,
                    is_current_user=u.id == user.id,
                )
            )
        out.sort(key=lambda m: (-ROLE_ORDER.get(m.role, 0), m.joined_at))
        return out


def _check_seat_limit(session: Session, team: Team) -> None:
    """Enforce member-count caps per plan."""
    caps = {
        "trial": 1,
        "starter": 1,
        "growth": 5,
        "enterprise": float("inf"),
    }
    cap = caps.get(team.plan, 1)
    current_count = len(
        session.exec(select(TeamMember).where(TeamMember.team_id == team.id)).all()
    )
    pending = len(
        session.exec(
            select(TeamInvite)
            .where(TeamInvite.team_id == team.id)
            .where(TeamInvite.accepted_at.is_(None))
            .where(TeamInvite.revoked_at.is_(None))
        ).all()
    )
    if current_count + pending >= cap:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Team is at the {team.plan} plan's seat limit ({cap}). "
                f"Upgrade to add more members."
            ),
        )


@router.post("/current/invites", response_model=TeamInviteResponse)
async def invite_member(payload: TeamInviteCreate, user: User = CurrentUser):
    if payload.role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="role must be admin, editor, or viewer")

    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        membership = _get_membership(session, team, user)
        _require_role(membership, "admin")
        _check_seat_limit(session, team)

        # Idempotency — skip if there's already a pending invite for this email
        existing = session.exec(
            select(TeamInvite)
            .where(TeamInvite.team_id == team.id)
            .where(TeamInvite.email == payload.email.lower())
            .where(TeamInvite.accepted_at.is_(None))
            .where(TeamInvite.revoked_at.is_(None))
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Invite already pending for this email")

        invite = TeamInvite(
            team_id=team.id,
            email=payload.email.lower().strip(),
            role=payload.role,
            token=secrets.token_urlsafe(32),
            invited_by_user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        session.add(invite)
        session.commit()
        session.refresh(invite)

        from .activity import log as log_activity
        log_activity(
            session,
            team_id=team.id,
            actor=user,
            action="member.invited",
            entity_type="invite",
            entity_id=invite.id,
            entity_label=invite.email,
            extra={"role": invite.role},
        )

        # Fire invite email
        try:
            from .email import _send, _wrap
            frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
            inviter = user.name or user.email
            accept_url = f"{frontend}/invite/{invite.token}"
            html = _wrap(
                f"""
                <h1>{inviter} invited you to join {team.name}</h1>
                <p>They've added you as a <strong>{payload.role}</strong> on Etimad Copilot. Accept to start collaborating on tenders.</p>
                <a href="{accept_url}" class="button">Accept invite →</a>
                <p class="muted" style="margin-top: 24px;">This link expires in 14 days. If you didn't expect this, you can safely ignore it.</p>
                """,
                preheader=f"You've been invited to {team.name} on Etimad Copilot",
            )
            _send(payload.email, f"{inviter} invited you to {team.name}", html, tags=[{"name": "category", "value": "team_invite"}])
        except Exception:
            logger.exception("Failed to send invite email")

        return TeamInviteResponse(
            id=invite.id,
            email=invite.email,
            role=invite.role,
            invited_by_user_id=invite.invited_by_user_id,
            expires_at=invite.expires_at,
            accepted_at=invite.accepted_at,
            created_at=invite.created_at,
        )


@router.get("/current/invites", response_model=list[TeamInviteResponse])
async def list_invites(user: User = CurrentUser):
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        membership = _get_membership(session, team, user)
        _require_role(membership, "admin")
        invites = session.exec(
            select(TeamInvite)
            .where(TeamInvite.team_id == team.id)
            .where(TeamInvite.accepted_at.is_(None))
            .where(TeamInvite.revoked_at.is_(None))
            .order_by(TeamInvite.created_at.desc())
        ).all()
        return [
            TeamInviteResponse(
                id=i.id,
                email=i.email,
                role=i.role,
                invited_by_user_id=i.invited_by_user_id,
                expires_at=i.expires_at,
                accepted_at=i.accepted_at,
                created_at=i.created_at,
            )
            for i in invites
        ]


@router.delete("/current/invites/{invite_id}")
async def revoke_invite(invite_id: str, user: User = CurrentUser):
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        membership = _get_membership(session, team, user)
        _require_role(membership, "admin")
        invite = session.get(TeamInvite, invite_id)
        if not invite or invite.team_id != team.id:
            raise HTTPException(status_code=404, detail="Invite not found")
        invite.revoked_at = datetime.now(timezone.utc)
        session.add(invite)
        session.commit()
        from .activity import log as log_activity
        log_activity(
            session, team_id=team.id, actor=user,
            action="member.invite_revoked", entity_type="invite",
            entity_id=invite.id, entity_label=invite.email,
        )
    return {"status": "revoked"}


@router.post("/invites/accept")
async def accept_invite(token: str, user: User = CurrentUser):
    with Session(_engine) as session:
        invite = session.exec(
            select(TeamInvite).where(TeamInvite.token == token)
        ).first()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        if invite.accepted_at or invite.revoked_at:
            raise HTTPException(status_code=400, detail="Invite already used or revoked")
        if invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite expired")
        if invite.email.lower() != user.email.lower():
            raise HTTPException(
                status_code=403,
                detail=f"Invite was sent to {invite.email}, but you're signed in as {user.email}",
            )

        existing = session.exec(
            select(TeamMember)
            .where(TeamMember.team_id == invite.team_id)
            .where(TeamMember.user_id == user.id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already a member of this team")

        membership = TeamMember(
            team_id=invite.team_id,
            user_id=user.id,
            role=invite.role,
            invited_by_user_id=invite.invited_by_user_id,
        )
        session.add(membership)
        invite.accepted_at = datetime.now(timezone.utc)
        session.add(invite)

        # Switch user's current team to the newly-joined team
        user.current_team_id = invite.team_id
        session.add(user)
        session.commit()

        from .activity import log as log_activity
        log_activity(
            session, team_id=invite.team_id, actor=user,
            action="member.joined", entity_type="member",
            entity_id=user.id, entity_label=user.email,
            extra={"role": invite.role},
        )

    return {"status": "joined", "team_id": invite.team_id}


@router.patch("/current/members/{user_id}/role")
async def change_member_role(user_id: str, role: str, user: User = CurrentUser):
    if role not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="role must be admin, editor, or viewer")
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        my_membership = _get_membership(session, team, user)
        _require_role(my_membership, "admin")

        member = session.exec(
            select(TeamMember)
            .where(TeamMember.team_id == team.id)
            .where(TeamMember.user_id == user_id)
        ).first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        if member.role == "owner":
            raise HTTPException(status_code=403, detail="Cannot change owner's role")
        prev_role = member.role
        member.role = role
        session.add(member)
        session.commit()
        member_user = session.get(User, user_id)
        from .activity import log as log_activity
        log_activity(
            session, team_id=team.id, actor=user,
            action="member.role_changed", entity_type="member",
            entity_id=user_id,
            entity_label=member_user.email if member_user else user_id,
            extra={"from": prev_role, "to": role},
        )
    return {"status": "updated"}


@router.delete("/current/members/{user_id}")
async def remove_member(user_id: str, user: User = CurrentUser):
    with Session(_engine) as session:
        team = _ensure_personal_team(session, user)
        my_membership = _get_membership(session, team, user)
        _require_role(my_membership, "admin")
        if user_id == team.owner_user_id:
            raise HTTPException(status_code=403, detail="Cannot remove the team owner")

        member = session.exec(
            select(TeamMember)
            .where(TeamMember.team_id == team.id)
            .where(TeamMember.user_id == user_id)
        ).first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        member_user = session.get(User, user_id)
        session.delete(member)
        session.commit()
        from .activity import log as log_activity
        log_activity(
            session, team_id=team.id, actor=user,
            action="member.removed", entity_type="member",
            entity_id=user_id,
            entity_label=member_user.email if member_user else user_id,
        )
    return {"status": "removed"}
