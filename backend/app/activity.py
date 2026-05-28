"""Activity log — record who did what on a team.

Use `log()` from any endpoint/background task to append an event. Failures here
are intentionally swallowed so they never break the originating user action.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from .auth import CurrentUser
from .models import ActivityEvent, ActivityEventResponse, User

logger = logging.getLogger(__name__)


def log(
    session: Session,
    *,
    team_id: str,
    actor: Optional[User],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_label: Optional[str] = None,
    extra: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> Optional[ActivityEvent]:
    """Append an activity event. Never raises — logs and returns None on error."""
    try:
        event = ActivityEvent(
            team_id=team_id,
            actor_user_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            actor_name=actor.name if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            extra=json.dumps(extra) if extra else None,
        )
        session.add(event)
        if commit:
            session.commit()
            session.refresh(event)
        return event
    except Exception:  # pragma: no cover — defensive
        logger.exception("Failed to log activity event %s", action)
        try:
            session.rollback()
        except Exception:
            pass
        return None


def _to_response(event: ActivityEvent) -> ActivityEventResponse:
    extra: Optional[dict] = None
    if event.extra:
        try:
            extra = json.loads(event.extra)
        except Exception:
            extra = None
    return ActivityEventResponse(
        id=event.id,
        actor_user_id=event.actor_user_id,
        actor_email=event.actor_email,
        actor_name=event.actor_name,
        action=event.action,
        entity_type=event.entity_type,
        entity_id=event.entity_id,
        entity_label=event.entity_label,
        extra=extra,
        created_at=event.created_at,
    )


# ─── Router ──────────────────────────────────────────────────────

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEventResponse])
async def list_activity(
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user: User = CurrentUser,
):
    """List recent activity for the current user's team, newest first."""
    # Lazy import to avoid circular
    from .main import engine
    from .teams import _ensure_personal_team

    with Session(engine) as session:
        team = _ensure_personal_team(session, user)
        query = (
            select(ActivityEvent)
            .where(ActivityEvent.team_id == team.id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
        )
        if entity_type:
            query = query.where(ActivityEvent.entity_type == entity_type)
        if entity_id:
            query = query.where(ActivityEvent.entity_id == entity_id)
        events = session.exec(query).all()
        return [_to_response(e) for e in events]
