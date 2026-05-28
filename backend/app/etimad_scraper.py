"""Etimad tender scraper.

A respectful scraper for the public Etimad tender listings at tenders.etimad.sa.

Design principles:
- Identifying User-Agent (no browser impersonation)
- Conservative rate limit (default 1 req / 6 seconds)
- Respects robots.txt
- Hard request cap per run (default 200)
- Audit log of every URL fetched and outcome
- Feature-flagged (etimad_scraper_enabled, off by default)
- Idempotent: stores by external_id, updates rather than duplicates

What this scraper does NOT do:
- Rotate IPs to evade rate limits
- Impersonate browsers or evade detection
- Bypass authentication or paywalls
- Scrape private/restricted data

Legal note: The Etimad portal is publicly browsable, but their ToS may restrict
automated access. This module is designed as a stop-gap pending an official
data partnership or licensed feed (Tendersinfo, Argaam, etc.). Operators should
read Etimad's Terms of Use, throttle aggressively, and respond to any cease
requests immediately.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
from sqlmodel import Session, create_engine, select

from .config import settings
from .models import DiscoveredTender

logger = logging.getLogger(__name__)


@dataclass
class ScrapeResult:
    listings_seen: int = 0
    new_tenders: int = 0
    updated_tenders: int = 0
    requests_made: int = 0
    errors: list[str] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    def summary(self) -> str:
        dur = "?"
        if self.completed_at:
            dur = f"{(self.completed_at - self.started_at).total_seconds():.1f}s"
        return (
            f"Scrape complete in {dur}: "
            f"{self.listings_seen} listings seen, "
            f"{self.new_tenders} new, "
            f"{self.updated_tenders} updated, "
            f"{self.requests_made} requests, "
            f"{len(self.errors)} errors"
        )


class EtimadScraper:
    """Polite scraper for the Etimad public tender portal."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        delay_s: Optional[float] = None,
        max_requests: Optional[int] = None,
        user_agent: Optional[str] = None,
        respect_robots: Optional[bool] = None,
    ):
        self.base_url = (base_url or settings.etimad_base_url).rstrip("/")
        self.delay_s = delay_s if delay_s is not None else settings.etimad_request_delay_s
        self.max_requests = max_requests or settings.etimad_max_requests_per_run
        self.user_agent = user_agent or settings.etimad_user_agent
        self.respect_robots = (
            respect_robots if respect_robots is not None else settings.etimad_respect_robots
        )

        self._robots: Optional[RobotFileParser] = None
        self._requests_made = 0

    # ─── robots.txt ─────────────────────────────────────

    async def _load_robots(self, client: httpx.AsyncClient) -> None:
        if not self.respect_robots:
            return
        robots_url = urljoin(self.base_url, "/robots.txt")
        try:
            response = await client.get(robots_url, timeout=10)
            if response.status_code == 200:
                self._robots = RobotFileParser()
                self._robots.parse(response.text.splitlines())
                logger.info("Loaded robots.txt from %s", robots_url)
            else:
                logger.warning(
                    "robots.txt returned %d — proceeding without it",
                    response.status_code,
                )
        except Exception as e:
            logger.warning("Could not fetch robots.txt: %s", e)

    def _allowed(self, url: str) -> bool:
        if not self.respect_robots or not self._robots:
            return True
        return self._robots.can_fetch(self.user_agent, url)

    # ─── HTTP plumbing ──────────────────────────────────

    async def _fetch(
        self, client: httpx.AsyncClient, url: str
    ) -> Optional[str]:
        if self._requests_made >= self.max_requests:
            logger.warning("Hit max_requests cap (%d) — stopping", self.max_requests)
            return None

        if not self._allowed(url):
            logger.info("Disallowed by robots.txt: %s", url)
            return None

        try:
            response = await client.get(
                url,
                timeout=30,
                follow_redirects=True,
                headers={"Accept-Language": "ar-SA,ar;q=0.9,en;q=0.7"},
            )
            self._requests_made += 1
            logger.info(
                "GET %s → %d (req #%d)", url, response.status_code, self._requests_made
            )
            if response.status_code == 429:
                logger.warning("Rate limited (429) — backing off")
                await asyncio.sleep(60)
                return None
            response.raise_for_status()
            # Polite delay AFTER each successful request
            await asyncio.sleep(self.delay_s)
            return response.text
        except httpx.HTTPError as e:
            logger.error("HTTP error fetching %s: %s", url, e)
            return None
        except Exception as e:
            logger.exception("Unexpected error fetching %s: %s", url, e)
            return None

    # ─── Parsing ────────────────────────────────────────
    # Note: Etimad uses a heavy client-side framework — these selectors are
    # placeholder/illustrative. Calibrate against the actual rendered HTML
    # when deploying (likely needs Playwright if pages are JS-rendered).

    def _parse_listing_page(self, html: str) -> list[dict]:
        """Parse the tender listing index page → list of summary dicts."""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        rows: list[dict] = []

        # Etimad listings are typically inside .table or cards — adjust selector
        for el in soup.select(".tender-card, .listing-row, tr.tender-row"):
            external_id_el = el.select_one(
                "[data-tender-id], .tender-ref, .reference-number"
            )
            title_el = el.select_one(".tender-name, .title, h3, h4")
            buyer_el = el.select_one(".buyer-name, .agency, .organization")
            detail_link_el = el.select_one("a[href*='/Tender/Details']")

            external_id = (
                external_id_el.get_text(strip=True) if external_id_el else None
            )
            title = title_el.get_text(strip=True) if title_el else None
            buyer = buyer_el.get_text(strip=True) if buyer_el else None
            detail_href = (
                detail_link_el.get("href") if detail_link_el else None
            )

            if not external_id and not detail_href:
                continue

            rows.append(
                {
                    "external_id": external_id,
                    "title_ar": title,
                    "buyer_ar": buyer,
                    "detail_url": (
                        urljoin(self.base_url, detail_href) if detail_href else None
                    ),
                }
            )

        return rows

    def _parse_detail_page(self, html: str, summary: dict) -> dict:
        """Parse a single tender detail page and merge into the summary dict."""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")

        def text(selector: str) -> Optional[str]:
            el = soup.select_one(selector)
            return el.get_text(strip=True) if el else None

        # Adjust selectors to match actual Etimad detail page structure
        description = text(".tender-description, .description, .objectives")
        industry = text(".activity, .industry, .sector")
        value_text = text(".estimated-value, .value, .budget")
        deadline_text = text(".submission-deadline, .end-date, .deadline")
        published_text = text(".publish-date, .published")

        return {
            **summary,
            "description": description,
            "industry": industry,
            "estimated_value_sar": self._parse_value_sar(value_text),
            "submission_deadline": self._parse_date(deadline_text),
            "published_date": self._parse_date(published_text),
        }

    @staticmethod
    def _parse_value_sar(text: Optional[str]) -> Optional[float]:
        if not text:
            return None
        # Strip non-numeric, handle Arabic digits
        normalized = text.translate(
            str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
        )
        digits = re.sub(r"[^\d.]", "", normalized)
        try:
            return float(digits) if digits else None
        except ValueError:
            return None

    @staticmethod
    def _parse_date(text: Optional[str]) -> Optional[datetime]:
        if not text:
            return None
        # Common Saudi date formats
        text = text.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text.strip(), fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    # ─── Persistence ────────────────────────────────────

    def _upsert_tender(self, session: Session, data: dict) -> tuple[bool, bool]:
        """Insert or update. Returns (is_new, was_updated)."""
        external_id = data.get("external_id")
        if not external_id:
            return False, False

        existing = session.exec(
            select(DiscoveredTender).where(
                DiscoveredTender.external_id == external_id
            )
        ).first()

        if existing:
            changed = False
            for field_name, value in data.items():
                if value is None or field_name == "detail_url":
                    continue
                if getattr(existing, field_name, None) != value:
                    setattr(existing, field_name, value)
                    changed = True
            if changed:
                session.add(existing)
                session.commit()
            return False, changed

        # New tender
        tender = DiscoveredTender(
            source="etimad",
            external_id=external_id,
            title=data.get("title_ar") or "Untitled tender",
            title_ar=data.get("title_ar"),
            buyer=data.get("buyer_ar") or "Unknown buyer",
            buyer_ar=data.get("buyer_ar"),
            industry=data.get("industry"),
            description=data.get("description"),
            estimated_value_sar=data.get("estimated_value_sar"),
            submission_deadline=data.get("submission_deadline"),
            published_date=data.get("published_date"),
            source_url=data.get("detail_url"),
        )
        session.add(tender)
        session.commit()
        return True, False

    # ─── Main scrape loop ───────────────────────────────

    async def run(self, listing_path: str = "/Tender/AllTendersForVisitor", max_pages: int = 5) -> ScrapeResult:
        if not settings.etimad_scraper_enabled:
            raise RuntimeError(
                "Etimad scraper is disabled. Set ETIMAD_SCRAPER_ENABLED=true to enable. "
                "Read Etimad ToS before enabling."
            )

        result = ScrapeResult()
        engine = create_engine(settings.database_url, echo=False)

        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}) as client:
            await self._load_robots(client)

            for page in range(1, max_pages + 1):
                if self._requests_made >= self.max_requests:
                    break

                page_url = f"{self.base_url}{listing_path}?page={page}"
                html = await self._fetch(client, page_url)
                if not html:
                    result.errors.append(f"Failed to fetch listing page {page}")
                    continue

                summaries = self._parse_listing_page(html)
                result.listings_seen += len(summaries)
                if not summaries:
                    logger.info("No listings on page %d — stopping pagination", page)
                    break

                for summary in summaries:
                    if self._requests_made >= self.max_requests:
                        break

                    if not summary.get("detail_url"):
                        continue

                    detail_html = await self._fetch(client, summary["detail_url"])
                    if not detail_html:
                        result.errors.append(
                            f"Failed to fetch detail for {summary.get('external_id')}"
                        )
                        continue

                    parsed = self._parse_detail_page(detail_html, summary)

                    with Session(engine) as session:
                        is_new, was_updated = self._upsert_tender(session, parsed)
                        if is_new:
                            result.new_tenders += 1
                        elif was_updated:
                            result.updated_tenders += 1

        result.requests_made = self._requests_made
        result.completed_at = datetime.now(timezone.utc)
        logger.info(result.summary())
        return result
