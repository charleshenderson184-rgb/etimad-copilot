"""Stripe billing — Checkout + webhooks + customer portal.

Env vars required:
    STRIPE_SECRET_KEY            sk_test_... or sk_live_...
    STRIPE_WEBHOOK_SECRET        whsec_... (from dashboard webhook config)
    STRIPE_PRICE_STARTER         price_xxx (matches PLAN.starter SAR 2,000/mo)
    STRIPE_PRICE_GROWTH          price_xxx (matches PLAN.growth   SAR 5,000/mo)
    STRIPE_PRICE_ENTERPRISE      price_xxx (matches PLAN.enterprise SAR 8,000/mo)
    BILLING_ENABLED              true (defaults false in dev)

Frontend pricing CTAs call POST /api/billing/checkout, get a redirect URL,
and bounce the browser to Stripe Checkout. Stripe webhooks update the
User.plan + plan_status when subscriptions activate/cancel/renew.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlmodel import Session, create_engine, select

from .auth import CurrentUser
from .config import settings
from .models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])

_engine = create_engine(settings.database_url, echo=False)


def billing_enabled() -> bool:
    return (
        os.getenv("BILLING_ENABLED", "false").lower() in ("true", "1", "yes")
        and bool(os.getenv("STRIPE_SECRET_KEY"))
    )


def _configure_stripe():
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not configured")
    stripe.api_key = key


def _price_for_plan(plan: str) -> str:
    mapping = {
        "starter": os.getenv("STRIPE_PRICE_STARTER"),
        "growth": os.getenv("STRIPE_PRICE_GROWTH"),
        "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE"),
    }
    price_id = mapping.get(plan)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Stripe price ID not configured for plan '{plan}'",
        )
    return price_id


@router.post("/checkout")
async def create_checkout_session(plan: str, request: Request, user: User = CurrentUser):
    """Creates a Stripe Checkout session for upgrading to a paid plan."""
    if not billing_enabled():
        # Dev fallback — just flip the plan locally so the UX flows
        with Session(_engine) as session:
            u = session.get(User, user.id)
            u.plan = plan
            u.plan_status = "active"
            session.add(u)
            session.commit()
        return {
            "url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account?upgraded=1",
            "dev_mode": True,
        }

    if plan not in ("starter", "growth", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    _configure_stripe()
    price_id = _price_for_plan(plan)
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")

    try:
        # Reuse or create Stripe customer
        if user.stripe_customer_id:
            customer_id = user.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name or user.email,
                metadata={"user_id": user.id},
            )
            customer_id = customer.id
            with Session(_engine) as session:
                u = session.get(User, user.id)
                u.stripe_customer_id = customer_id
                session.add(u)
                session.commit()

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{frontend}/account?upgraded=1&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend}/pricing?canceled=1",
            client_reference_id=user.id,
            subscription_data={
                "metadata": {"user_id": user.id, "plan": plan},
            },
        )
        return {"url": session.url}

    except stripe.error.StripeError as e:
        logger.exception("Stripe checkout failed for user %s", user.id)
        raise HTTPException(status_code=502, detail=f"Stripe error: {e.user_message}")


@router.post("/portal")
async def create_portal_session(user: User = CurrentUser):
    """Returns the Stripe Customer Portal URL for self-service billing management."""
    if not billing_enabled():
        return {"url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account", "dev_mode": True}

    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer for this user")

    _configure_stripe()
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{frontend}/account",
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e.user_message}")


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """Handles Stripe webhook events to keep User.plan in sync."""
    if not billing_enabled():
        return {"status": "billing_disabled"}

    _configure_stripe()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning("Webhook signature verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    et = event["type"]
    obj = event["data"]["object"]

    logger.info("Stripe webhook: %s", et)

    if et == "checkout.session.completed":
        user_id = obj.get("client_reference_id")
        customer_id = obj.get("customer")
        subscription_id = obj.get("subscription")
        if user_id:
            _apply_subscription(user_id, customer_id, subscription_id)

    elif et in ("customer.subscription.created", "customer.subscription.updated"):
        customer_id = obj.get("customer")
        subscription_id = obj.get("id")
        plan = (obj.get("metadata") or {}).get("plan")
        status = obj.get("status")  # active | past_due | canceled | trialing
        renews_at = obj.get("current_period_end")
        _sync_subscription(
            customer_id=customer_id,
            subscription_id=subscription_id,
            plan=plan,
            status=status,
            renews_at_ts=renews_at,
        )

    elif et == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        _sync_subscription(
            customer_id=customer_id,
            subscription_id=obj.get("id"),
            plan="trial",
            status="canceled",
            renews_at_ts=None,
        )

    return {"received": True}


def _apply_subscription(user_id: str, customer_id: Optional[str], subscription_id: Optional[str]):
    with Session(_engine) as session:
        user = session.get(User, user_id)
        if user:
            user.stripe_customer_id = customer_id or user.stripe_customer_id
            user.stripe_subscription_id = subscription_id or user.stripe_subscription_id
            session.add(user)
            session.commit()


def _sync_subscription(
    customer_id: Optional[str],
    subscription_id: Optional[str],
    plan: Optional[str],
    status: Optional[str],
    renews_at_ts: Optional[int],
):
    if not customer_id:
        return
    with Session(_engine) as session:
        user = session.exec(
            select(User).where(User.stripe_customer_id == customer_id)
        ).first()
        if not user:
            logger.warning("Webhook for unknown customer %s", customer_id)
            return
        if plan:
            user.plan = plan
        if status:
            mapped = {
                "active": "active",
                "trialing": "active",
                "past_due": "past_due",
                "canceled": "canceled",
                "incomplete": "past_due",
                "incomplete_expired": "canceled",
                "paused": "paused",
            }.get(status, "active")
            user.plan_status = mapped
        if subscription_id:
            user.stripe_subscription_id = subscription_id
        if renews_at_ts:
            user.plan_renews_at = datetime.fromtimestamp(renews_at_ts, tz=timezone.utc)
        session.add(user)
        session.commit()
