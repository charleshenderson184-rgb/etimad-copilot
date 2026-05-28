"""Comments + Notifications.

POST /api/comments         create a comment (parses @mentions, spawns notifications)
GET  /api/comments         list comments for a target
DELETE /api/comments/{id}  soft-delete (author or admin only)

GET  /api/notifications              list current user's notifications (unread first)
POST /api/notifications/{id}/read    mark single as read
POST /api/notifications/mark-all-read
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from .auth import CurrentUser
from .models import (
    Comment,
    CommentCreate,
    CommentResponse,
    Notification,
    NotificationResponse,
    RFP,
    TeamMember,
    User,
)

logger = logging.getLogger(__name__)

# Match @something where something is an email-ish token or a name fragment.
# Accept @local@domain too — captures up to next whitespace, comma, or closing bracket.
_MENTION_RE = re.compile(r"@([A-Za-z0-9._%+\-]+(?:@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})?)")


def _resolve_mentions(session: Session, team_id: str, body: str) -> list[User]:
    """Find team members matching any @-mention in the body."""
    raw_tokens = {m.group(1).lower().rstrip(".,;:") for m in _MENTION_RE.finditer(body)}
    if not raw_tokens:
        return []

    # Pull all team members once
    members = session.exec(
        select(User, TeamMember)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    ).all()

    matched: dict[str, User] = {}
    for token in raw_tokens:
        for user, _membership in members:
            email = (user.email or "").lower()
            name = (user.name or "").lower()
            handle = email.split("@")[0] if email else ""
            if token == email or token == handle or (name and token in name.replace(" ", "")):
                matched[user.id] = user
                break
    return list(matched.values())


def _comment_to_response(
    session: Session, comment: Comment, mentioned_user_ids: Optional[list[str]] = None
) -> CommentResponse:
    author = session.get(User, comment.author_user_id)
    return CommentResponse(
        id=comment.id,
        author_user_id=comment.author_user_id,
        author_email=author.email if author else None,
        author_name=author.name if author else None,
        target_type=comment.target_type,
        target_id=comment.target_id,
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        mentioned_user_ids=mentioned_user_ids or [],
    )


def _ensure_target_in_team(session: Session, target_type: str, target_id: str, team_id: str) -> None:
    """Reject comments on targets outside the team."""
    from .models import Proposal, Requirement

    if target_type == "rfp":
        rfp = session.get(RFP, target_id)
        if not rfp:
            raise HTTPException(status_code=404, detail="Target not found")
        if rfp.team_id and rfp.team_id != team_id:
            raise HTTPException(status_code=404, detail="Target not found")
    elif target_type == "requirement":
        req = session.get(Requirement, target_id)
        if not req:
            raise HTTPException(status_code=404, detail="Target not found")
        rfp = session.get(RFP, req.rfp_id)
        if not rfp or (rfp.team_id and rfp.team_id != team_id):
            raise HTTPException(status_code=404, detail="Target not found")
    elif target_type == "proposal":
        prop = session.get(Proposal, target_id)
        if not prop:
            raise HTTPException(status_code=404, detail="Target not found")
        rfp = session.get(RFP, prop.rfp_id)
        if not rfp or (rfp.team_id and rfp.team_id != team_id):
            raise HTTPException(status_code=404, detail="Target not found")


# ─── Router ──────────────────────────────────────────────────────

router = APIRouter(tags=["comments"])


@router.post("/api/comments", response_model=CommentResponse)
async def create_comment(payload: CommentCreate, user: User = CurrentUser):
    from .main import engine
    from .teams import _ensure_personal_team
    from .activity import log as log_activity

    if payload.target_type not in {"rfp", "proposal", "requirement"}:
        raise HTTPException(status_code=400, detail="invalid target_type")
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="comment body required")

    with Session(engine) as session:
        team = _ensure_personal_team(session, user)
        _ensure_target_in_team(session, payload.target_type, payload.target_id, team.id)

        comment = Comment(
            team_id=team.id,
            author_user_id=user.id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            body=payload.body.strip(),
        )
        session.add(comment)
        session.commit()
        session.refresh(comment)

        # Resolve @mentions and spawn notifications
        mentions = _resolve_mentions(session, team.id, comment.body)
        mentioned_ids: list[str] = []
        actor_label = user.name or user.email or "Someone"
        from .models import Proposal, Requirement
        rfp_title = None
        parent_rfp_id: Optional[str] = None
        if payload.target_type == "rfp":
            parent_rfp_id = payload.target_id
        elif payload.target_type == "requirement":
            req = session.get(Requirement, payload.target_id)
            if req:
                parent_rfp_id = req.rfp_id
        elif payload.target_type == "proposal":
            prop = session.get(Proposal, payload.target_id)
            if prop:
                parent_rfp_id = prop.rfp_id

        if parent_rfp_id:
            rfp = session.get(RFP, parent_rfp_id)
            if rfp:
                rfp_title = rfp.title or rfp.filename
        link_url = f"/rfp/{parent_rfp_id}" if parent_rfp_id else None

        for m in mentions:
            if m.id == user.id:
                continue  # don't notify self
            n = Notification(
                user_id=m.id,
                team_id=team.id,
                kind="mention",
                title=f"{actor_label} mentioned you",
                body=(comment.body[:200] + "…") if len(comment.body) > 200 else comment.body,
                link_url=link_url,
                actor_user_id=user.id,
                actor_email=user.email,
                actor_name=user.name,
                source_type="comment",
                source_id=comment.id,
            )
            session.add(n)
            mentioned_ids.append(m.id)

        session.commit()

        # Audit trail
        log_activity(
            session,
            team_id=team.id,
            actor=user,
            action="comment.posted",
            entity_type=payload.target_type,
            entity_id=payload.target_id,
            entity_label=rfp_title,
            extra={"mentions": len(mentioned_ids)} if mentioned_ids else None,
        )

        return _comment_to_response(session, comment, mentioned_ids)


@router.get("/api/comments", response_model=list[CommentResponse])
async def list_comments(
    target_type: str = Query(...),
    target_id: str = Query(...),
    user: User = CurrentUser,
):
    from .main import engine
    from .teams import _ensure_personal_team

    with Session(engine) as session:
        team = _ensure_personal_team(session, user)
        _ensure_target_in_team(session, target_type, target_id, team.id)

        comments = session.exec(
            select(Comment)
            .where(Comment.team_id == team.id)
            .where(Comment.target_type == target_type)
            .where(Comment.target_id == target_id)
            .where(Comment.deleted_at.is_(None))
            .order_by(Comment.created_at.asc())
        ).all()
        return [_comment_to_response(session, c) for c in comments]


@router.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, user: User = CurrentUser):
    from .main import engine
    from .teams import _ensure_personal_team, _get_membership

    with Session(engine) as session:
        comment = session.get(Comment, comment_id)
        if not comment or comment.deleted_at:
            raise HTTPException(status_code=404, detail="Comment not found")
        team = _ensure_personal_team(session, user)
        if comment.team_id != team.id:
            raise HTTPException(status_code=404, detail="Comment not found")

        membership = _get_membership(session, team, user)
        is_admin = membership and membership.role in ("admin", "owner")
        if comment.author_user_id != user.id and not is_admin:
            raise HTTPException(status_code=403, detail="Not allowed")

        comment.deleted_at = datetime.now(timezone.utc)
        session.add(comment)
        session.commit()
    return {"status": "deleted"}


# ─── Notifications ──────────────────────────────────────────

@router.get("/api/notifications", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    user: User = CurrentUser,
):
    from .main import engine

    with Session(engine) as session:
        query = (
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        notifs = session.exec(query).all()
        return [
            NotificationResponse(
                id=n.id,
                kind=n.kind,
                title=n.title,
                body=n.body,
                link_url=n.link_url,
                actor_email=n.actor_email,
                actor_name=n.actor_name,
                source_type=n.source_type,
                source_id=n.source_id,
                read_at=n.read_at,
                created_at=n.created_at,
            )
            for n in notifs
        ]


@router.post("/api/notifications/{notification_id}/read")
async def mark_read(notification_id: str, user: User = CurrentUser):
    from .main import engine

    with Session(engine) as session:
        n = session.get(Notification, notification_id)
        if not n or n.user_id != user.id:
            raise HTTPException(status_code=404, detail="Notification not found")
        if not n.read_at:
            n.read_at = datetime.now(timezone.utc)
            session.add(n)
            session.commit()
    return {"status": "read"}


@router.post("/api/notifications/mark-all-read")
async def mark_all_read(user: User = CurrentUser):
    from .main import engine

    with Session(engine) as session:
        unread = session.exec(
            select(Notification)
            .where(Notification.user_id == user.id)
            .where(Notification.read_at.is_(None))
        ).all()
        now = datetime.now(timezone.utc)
        for n in unread:
            n.read_at = now
            session.add(n)
        session.commit()
        return {"marked": len(unread)}
