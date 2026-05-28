"""Transactional + scheduled emails via Resend.

Env vars:
    RESEND_API_KEY        re_xxxxx
    EMAIL_FROM            "Etimad Copilot <hello@your-domain.com>"
    EMAIL_ENABLED         true (default false in dev — logs to console)

The platform sends six categories of mail:

  1. welcome              — on signup, with quick-start checklist
  2. daily_digest         — every morning, top matched tenders + upcoming deadlines
  3. deadline_alert       — N days before submission_deadline (N=7, 3, 1)
  4. proposal_ready       — when a proposal generation completes
  5. status_won           — when a tender is marked won (with congrats + ROI calc)
  6. weekly_summary       — Sunday roll-up: wins, losses, pipeline, recommendations

Each template is plain inline HTML — no separate template engine needed for now.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


def email_enabled() -> bool:
    return (
        os.getenv("EMAIL_ENABLED", "false").lower() in ("true", "1", "yes")
        and bool(os.getenv("RESEND_API_KEY"))
    )


def _send(
    to: str,
    subject: str,
    html: str,
    *,
    reply_to: Optional[str] = None,
    tags: Optional[list[dict]] = None,
) -> Optional[str]:
    """Sends an email via Resend. Returns Resend message id, or None in dev mode."""
    if not email_enabled():
        # Dev mode — log preview for visibility
        logger.info(
            "[EMAIL DEV] to=%s subject=%r (set RESEND_API_KEY + EMAIL_ENABLED=true to send)",
            to,
            subject,
        )
        return None

    import resend

    resend.api_key = os.getenv("RESEND_API_KEY")
    from_addr = os.getenv("EMAIL_FROM", "Etimad Copilot <hello@etimad-copilot.app>")

    params: dict = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        params["reply_to"] = reply_to
    if tags:
        params["tags"] = tags

    try:
        result = resend.Emails.send(params)
        logger.info("Sent email %s to %s subject=%r", result.get("id"), to, subject)
        return result.get("id")
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        return None


# ─── HTML template helpers ──────────────────────────────────

_BASE_STYLES = """
    body { margin: 0; padding: 0; background: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e7e5e4; }
    .header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #047857, #064e3b); display: inline-block; }
    h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 12px; color: #0c0a09; }
    h2 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; color: #292524; }
    p { font-size: 15px; line-height: 1.6; color: #44403c; margin: 8px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #047857, #064e3b); color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .row { padding: 12px 0; border-bottom: 1px solid #f5f5f4; }
    .row:last-child { border-bottom: none; }
    .muted { color: #78716c; font-size: 13px; }
    .pill { display: inline-block; background: #d1fae5; color: #064e3b; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e7e5e4; font-size: 12px; color: #a8a29e; text-align: center; }
"""


def _wrap(content_html: str, preheader: str = "") -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <style>{_BASE_STYLES}</style>
</head>
<body>
  <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">{preheader}</span>
  <div class="container">
    <div class="header">
      <span class="logo"></span>
      <strong style="font-size: 15px;">Etimad Copilot</strong>
      <span style="color: #a8a29e; font-size: 13px;">·</span>
      <span style="color: #78716c; font-size: 13px;" dir="rtl">مساعد المنافسات</span>
    </div>
    <div class="card">
      {content_html}
    </div>
    <div class="footer">
      Built for KSA SMEs · Vision 2030<br/>
      <a href="{os.getenv('FRONTEND_URL', 'https://etimad-copilot.app')}/account" style="color: #047857;">Manage notifications</a>
    </div>
  </div>
</body>
</html>"""


# ─── Public send functions ──────────────────────────────────

def send_welcome(to: str, name: str) -> Optional[str]:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    first = name.split(" ")[0] if name else "there"
    html = _wrap(
        f"""
        <h1>Welcome to Etimad Copilot, {first} 👋</h1>
        <p>You're in. Here's how to win your first tender this week:</p>
        <ol style="padding-left: 20px; color: #44403c; line-height: 1.8;">
            <li><strong>Set up your company profile</strong> — 5 minutes, dramatically improves proposal quality</li>
            <li><strong>Upload a recent winning proposal</strong> — trains the platform on your voice</li>
            <li><strong>Browse Discover</strong> — see today's tenders ranked by fit</li>
        </ol>
        <p style="margin-top: 24px;">Your <strong>14-day free trial</strong> includes 2 RFP analyses and 1 proposal generation. No card required.</p>
        <a href="{frontend}/profile" class="button">Set up profile →</a>
        <p class="muted" style="margin-top: 24px;">Questions? Just reply to this email — I read every one.</p>
        """,
        preheader="Welcome! Here's how to win your first tender this week.",
    )
    return _send(to, "Welcome to Etimad Copilot — let's win your first tender", html, tags=[{"name": "category", "value": "welcome"}])


def send_proposal_ready(to: str, rfp_title: str, proposal_id: str) -> Optional[str]:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    html = _wrap(
        f"""
        <h1>Your proposal is ready ✓</h1>
        <p>The bilingual proposal for <strong>{rfp_title}</strong> is drafted and ready to review.</p>
        <p>Both English and Arabic versions were generated as separate documents, formatted for direct submission to Etimad.</p>
        <a href="{frontend}/proposal/{proposal_id}" class="button">Review proposal →</a>
        <p class="muted" style="margin-top: 24px;">Run a Red Team review before submission — it's the highest-leverage check for catching scoring gaps.</p>
        """,
        preheader=f"Your proposal for {rfp_title} is ready to review.",
    )
    return _send(to, f"✓ Proposal ready: {rfp_title}", html, tags=[{"name": "category", "value": "proposal_ready"}])


def send_deadline_alert(to: str, rfp_title: str, days_left: int, rfp_id: str) -> Optional[str]:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    urgency_color = "#dc2626" if days_left <= 1 else "#d97706" if days_left <= 3 else "#047857"
    label = "due today" if days_left == 0 else f"{days_left} day{'s' if days_left != 1 else ''} left"
    html = _wrap(
        f"""
        <h1 style="color: {urgency_color};">{rfp_title}</h1>
        <p><span class="pill" style="background: {urgency_color}22; color: {urgency_color};">{label.upper()}</span></p>
        <p>Heads up — submission for this tender is approaching. Make sure your proposal is reviewed and exported.</p>
        <a href="{frontend}/rfp/{rfp_id}" class="button">Open tender →</a>
        """,
        preheader=f"{rfp_title} — {label}",
    )
    subject_emoji = "🚨" if days_left <= 1 else "⏰"
    return _send(to, f"{subject_emoji} {label}: {rfp_title}", html, tags=[{"name": "category", "value": "deadline_alert"}])


def send_daily_digest(
    to: str,
    name: str,
    top_matches: list[dict],
    upcoming_deadlines: list[dict],
) -> Optional[str]:
    """Daily digest email — top matches + upcoming deadlines."""
    if not top_matches and not upcoming_deadlines:
        return None  # Nothing to send, skip

    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    first = name.split(" ")[0] if name else "there"
    today = datetime.now(timezone.utc).strftime("%A, %B %d")

    matches_html = ""
    if top_matches:
        rows = []
        for m in top_matches[:5]:
            rows.append(
                f"""
                <div class="row">
                    <a href="{frontend}/discover" style="text-decoration: none; color: #0c0a09;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="width: 36px; height: 36px; border-radius: 50%; background: #d1fae5; color: #064e3b; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; justify-content: center;">{m['match_score']}</span>
                            <div style="flex: 1;">
                                <p style="margin: 0; font-weight: 600; font-size: 14px;">{m['title']}</p>
                                <p style="margin: 2px 0 0; font-size: 12px; color: #78716c;">{m.get('buyer', '')} · {m.get('days_left', '?')} days left</p>
                            </div>
                        </div>
                    </a>
                </div>
                """
            )
        matches_html = f"""
            <h2>Top matches today</h2>
            <p class="muted" style="margin-top: -4px;">Ranked against your company profile</p>
            {''.join(rows)}
        """

    deadlines_html = ""
    if upcoming_deadlines:
        rows = []
        for d in upcoming_deadlines[:5]:
            rows.append(
                f"""
                <div class="row">
                    <p style="margin: 0; font-weight: 600; font-size: 14px;">{d['title']}</p>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #78716c;">{d.get('days_left', '?')} days left · {d.get('buyer', '')}</p>
                </div>
                """
            )
        deadlines_html = f"""
            <h2 style="margin-top: 28px;">Your upcoming deadlines</h2>
            {''.join(rows)}
        """

    html = _wrap(
        f"""
        <h1>Good morning, {first} ☀️</h1>
        <p>{today} · {len(top_matches)} new matches · {len(upcoming_deadlines)} approaching deadlines</p>
        {matches_html}
        {deadlines_html}
        <a href="{frontend}/discover" class="button">View all tenders →</a>
        """,
        preheader=f"{len(top_matches)} new strong-fit tenders today",
    )
    return _send(to, f"📋 Etimad digest · {today}", html, tags=[{"name": "category", "value": "daily_digest"}])


def send_status_won(to: str, name: str, rfp_title: str, value_sar: Optional[float]) -> Optional[str]:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    first = name.split(" ")[0] if name else "there"
    value_str = (
        f"SAR {value_sar / 1_000_000:.1f}M"
        if value_sar and value_sar >= 1_000_000
        else (f"SAR {value_sar:,.0f}" if value_sar else "")
    )

    html = _wrap(
        f"""
        <h1>You won! 🎉</h1>
        <p>{first}, congratulations on winning <strong>{rfp_title}</strong>{f" ({value_str})" if value_str else ""}.</p>
        <p>This is what the platform is for. Take 30 seconds to reflect — what worked? Capture it in your win-themes library so the next bid lands even faster.</p>
        <a href="{frontend}/analytics" class="button">View win analytics →</a>
        <p class="muted" style="margin-top: 24px;">Per our agreement, our success fee applies on Growth+ plans. You'll receive an invoice within 30 days.</p>
        """,
        preheader=f"You won {rfp_title}",
    )
    return _send(to, f"🎉 You won {rfp_title}!", html, tags=[{"name": "category", "value": "status_won"}])
