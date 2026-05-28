"""Authentication & user-context dependencies.

This module wires Supabase JWTs into the request lifecycle:
- `current_user`           — requires a valid JWT, raises 401 otherwise
- `current_user_optional`  — returns user if logged in, None otherwise
- `dev_user_fallback`      — a single-tenant fallback for local dev (no Supabase)

To enable real auth in production, set these env vars:
    SUPABASE_URL                 https://xxxxx.supabase.co
    SUPABASE_JWT_SECRET          your_jwt_secret (used to verify HS256 tokens)
    AUTH_ENABLED                 true

When AUTH_ENABLED is false (default), all requests resolve to a single
"dev_user" record so the app keeps working locally without Supabase.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session, create_engine, select

from .config import settings
from .models import User

logger = logging.getLogger(__name__)

# Local engine — separate from main.py's to avoid circular import
_engine = create_engine(settings.database_url, echo=False)


def _get_dev_user() -> User:
    """Returns (and lazily creates) the single dev user used when AUTH_ENABLED=false."""
    with Session(_engine) as session:
        user = session.exec(
            select(User).where(User.email == "dev@etimad-copilot.local")
        ).first()
        if user is None:
            user = User(
                email="dev@etimad-copilot.local",
                name="Dev User",
                plan="enterprise",  # Full features in local dev
                plan_status="active",
                trial_ends_at=None,
                last_login_at=datetime.now(timezone.utc),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        return user


def _verify_supabase_jwt(token: str) -> dict:
    """Validate a Supabase JWT and return its claims."""
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_JWT_SECRET not configured but AUTH_ENABLED=true",
        )
    try:
        # Supabase uses HS256 by default
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase aud varies
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def _resolve_user_from_claims(claims: dict) -> User:
    """Find or create a User row for a Supabase auth user."""
    auth_id = claims.get("sub")
    email = claims.get("email")
    if not auth_id or not email:
        raise HTTPException(status_code=401, detail="Token missing sub or email")

    with Session(_engine) as session:
        user = session.exec(
            select(User).where(User.auth_provider_id == auth_id)
        ).first()

        if user is None:
            # Maybe they signed up with an email that already exists
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                existing.auth_provider_id = auth_id
                existing.last_login_at = datetime.now(timezone.utc)
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return existing
            # New user — provision with 14-day trial
            from datetime import timedelta
            user = User(
                auth_provider_id=auth_id,
                email=email,
                name=claims.get("user_metadata", {}).get("name"),
                plan="trial",
                plan_status="active",
                trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
                last_login_at=datetime.now(timezone.utc),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            logger.info("Provisioned new user from JWT: %s", email)
            # Welcome email (fire-and-forget, errors logged)
            try:
                from .email import send_welcome
                send_welcome(to=email, name=user.name or email.split("@")[0])
            except Exception:
                logger.exception("Failed to send welcome email")
        else:
            user.last_login_at = datetime.now(timezone.utc)
            session.add(user)
            session.commit()
            session.refresh(user)

        return user


def auth_enabled() -> bool:
    return os.getenv("AUTH_ENABLED", "false").lower() in ("true", "1", "yes")


async def current_user(request: Request) -> User:
    """Require an authenticated user. Raises 401 if none."""
    if not auth_enabled():
        return _get_dev_user()

    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = header[7:].strip()
    claims = _verify_supabase_jwt(token)
    return _resolve_user_from_claims(claims)


async def current_user_optional(request: Request) -> Optional[User]:
    """Returns the user if authenticated, None otherwise. Never raises."""
    if not auth_enabled():
        return _get_dev_user()

    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        token = header[7:].strip()
        claims = _verify_supabase_jwt(token)
        return _resolve_user_from_claims(claims)
    except HTTPException:
        return None


# Aliases for FastAPI Depends() — these are the public surface
CurrentUser = Depends(current_user)
CurrentUserOptional = Depends(current_user_optional)
