"""Tender discovery — scrape, store, and rank Etimad tenders by buyer-fit."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from .models import CompanyProfile, DiscoveredTender, MatchReason

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    score: int  # 0..100
    reasons: list[MatchReason]


def _profile_industries(profile: CompanyProfile) -> list[str]:
    raw = (profile.industries or "").lower()
    return [s.strip() for s in raw.replace(";", ",").split(",") if s.strip()]


def _profile_services(profile: CompanyProfile) -> list[str]:
    raw = (profile.services or "").lower()
    return [s.strip() for s in raw.replace(";", ",").split(",") if s.strip()]


def match_tender(
    tender: DiscoveredTender, profile: Optional[CompanyProfile]
) -> MatchResult:
    """Score 0..100 — how well this tender matches the company's profile."""
    reasons: list[MatchReason] = []
    score = 0

    if not profile:
        return MatchResult(
            score=50,
            reasons=[
                MatchReason(
                    label="No company profile yet",
                    score=50,
                    detail="Add your services and industries to get personalized matches.",
                )
            ],
        )

    industries = _profile_industries(profile)
    services = _profile_services(profile)

    # Industry / sector match — 25 pts
    tender_industry = (tender.industry or "").lower()
    tender_desc = (tender.description or "").lower()
    tender_title = (tender.title or "").lower()
    if industries:
        hits = [
            ind for ind in industries
            if ind in tender_industry or ind in tender_desc or ind in tender_title
        ]
        if hits:
            pts = min(25, 12 + 6 * len(hits))
            score += pts
            reasons.append(
                MatchReason(
                    label=f"Industry fit: {', '.join(hits[:3])}",
                    score=pts,
                    detail="Matches industries from your profile",
                )
            )

    # Service / capability match — 20 pts
    if services:
        text_blob = f"{tender_title} {tender_desc} {tender_industry}"
        service_hits = [s for s in services if s and s in text_blob]
        if service_hits:
            pts = min(20, 8 + 6 * len(service_hits))
            score += pts
            reasons.append(
                MatchReason(
                    label=f"Service match: {', '.join(service_hits[:3])}",
                    score=pts,
                    detail="Your offerings match this scope",
                )
            )

    # LCGPA fit — 15 pts (we exceed minimum)
    if tender.lcgpa_min_score is not None:
        # Approximate company's LCGPA from saudization (rough proxy)
        company_lcgpa = profile.saudization_pct or 0
        if company_lcgpa >= tender.lcgpa_min_score:
            pts = 15
            score += pts
            reasons.append(
                MatchReason(
                    label=f"Meets LCGPA minimum ({tender.lcgpa_min_score}%)",
                    score=pts,
                    detail=f"Your {company_lcgpa}% Saudization clears the bar.",
                )
            )
        else:
            reasons.append(
                MatchReason(
                    label=f"LCGPA gap: tender wants {tender.lcgpa_min_score}%",
                    score=0,
                    detail=f"Your profile shows {company_lcgpa}%. May disqualify.",
                )
            )

    # Saudization fit — 10 pts
    if tender.saudization_min is not None and profile.saudization_pct is not None:
        if profile.saudization_pct >= tender.saudization_min:
            pts = 10
            score += pts
            reasons.append(
                MatchReason(
                    label="Saudization minimum met",
                    score=pts,
                )
            )

    # Deadline workability — 15 pts (sweet spot: 14-45 days)
    if tender.submission_deadline:
        dl = tender.submission_deadline
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        days = (dl - datetime.now(timezone.utc)).days
        if days >= 21 and days <= 60:
            pts = 15
            score += pts
            reasons.append(
                MatchReason(
                    label=f"Workable timeline ({days} days)",
                    score=pts,
                    detail="Enough time to draft a strong response.",
                )
            )
        elif days >= 10 and days < 21:
            pts = 10
            score += pts
            reasons.append(
                MatchReason(
                    label=f"Tight but doable ({days} days)",
                    score=pts,
                )
            )
        elif days < 10 and days >= 0:
            reasons.append(
                MatchReason(
                    label=f"Very tight ({days} days)",
                    score=0,
                    detail="High effort, low probability without prep.",
                )
            )
        elif days < 0:
            reasons.append(
                MatchReason(
                    label="Past deadline",
                    score=0,
                )
            )

    # Value sweet-spot — 15 pts (matches company size by team size proxy)
    if tender.estimated_value_sar and profile.team_size:
        capacity_sar = profile.team_size * 1_500_000  # rough annual capacity
        if 0.2 * capacity_sar <= tender.estimated_value_sar <= 2 * capacity_sar:
            pts = 15
            score += pts
            reasons.append(
                MatchReason(
                    label="Right-sized for your team",
                    score=pts,
                    detail=f"~SAR {tender.estimated_value_sar/1_000_000:.1f}M fits your delivery capacity.",
                )
            )
        elif tender.estimated_value_sar > 2 * capacity_sar:
            reasons.append(
                MatchReason(
                    label="Larger than typical fit",
                    score=0,
                    detail="Possible with subcontracting / partnership.",
                )
            )

    # Cap and floor
    score = max(0, min(100, score))
    return MatchResult(score=score, reasons=reasons)
