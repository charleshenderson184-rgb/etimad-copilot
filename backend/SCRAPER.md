# Etimad Scraper — Operator Guide

A respectful scraper for the public Etimad tender portal at https://tenders.etimad.sa.

## Status: Disabled by default

The scraper is **off by default**. You must explicitly enable it via the
`ETIMAD_SCRAPER_ENABLED=true` environment variable.

**Before enabling, read https://tenders.etimad.sa/Terms** and ensure your use is compliant.

## Safeguards built in

| Safeguard | Default | Override |
|---|---|---|
| Feature flag | Off | `ETIMAD_SCRAPER_ENABLED=true` |
| Request delay | 6.0 s between requests | `ETIMAD_REQUEST_DELAY_S` |
| Max requests per run | 200 | `ETIMAD_MAX_REQUESTS_PER_RUN` |
| Identifying User-Agent | `EtimadCopilotBot/0.1` | `ETIMAD_USER_AGENT` |
| Respect robots.txt | Yes | `ETIMAD_RESPECT_ROBOTS=false` (don't) |

## What this scraper does NOT do

- Rotate IPs / use proxies to evade rate limits
- Impersonate browsers or hide identity
- Bypass authentication or access controls
- Scrape private/restricted data
- Solve CAPTCHAs

If any of those become necessary to operate, **stop scraping and pursue a partnership or licensed feed instead** (see "Alternatives" below).

## Usage

### One-off CLI run (manual / cron)

```bash
ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py
ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py --max-pages 3 --verbose
```

### Daily cron (recommended schedule: 6am Riyadh = 3am UTC)

```cron
0 3 * * *  cd /app && ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py >> /var/log/etimad-scraper.log 2>&1
```

### Trigger from API (admin only — protect this in production)

```bash
curl -X POST "http://api.example.com/api/admin/scrape-etimad?max_pages=3"
curl "http://api.example.com/api/admin/scraper-status"
```

## Calibration

The HTML selectors in `etimad_scraper.py` are illustrative placeholders. The actual Etimad portal uses client-side rendering, so you'll likely need to:

1. **Inspect the live page** in DevTools and update the CSS selectors in
   `_parse_listing_page()` and `_parse_detail_page()`
2. **Consider Playwright** if the page is heavily JS-rendered (the current
   implementation uses plain httpx + BeautifulSoup, which won't execute JavaScript)

To switch to Playwright:

```bash
pip install playwright
playwright install chromium --with-deps
```

Then replace the `_fetch()` HTTP calls with a Playwright page navigation. Keep all the safeguards (delay, max-requests, robots.txt) in place.

## Monitoring

The scraper logs every request, every fetch outcome, and a summary on completion:

```
2026-05-19 10:00:01 INFO [app.etimad_scraper] Loaded robots.txt from https://tenders.etimad.sa/robots.txt
2026-05-19 10:00:07 INFO [app.etimad_scraper] GET https://tenders.etimad.sa/Tender/AllTendersForVisitor?page=1 → 200 (req #1)
...
Scrape complete in 218.4s: 47 listings seen, 12 new, 8 updated, 55 requests, 0 errors
```

If you see 429s (rate limited), the scraper backs off 60s automatically — but you should also **increase `ETIMAD_REQUEST_DELAY_S`** for future runs.

If you see ANY cease-and-desist or blocking, **stop immediately** and switch to:

## Alternatives (highly recommended for production)

1. **Licensed data feed** — Tendersinfo.com, Argaam Bids, or similar. ~$5-30K/year. Legal, reliable, no maintenance.
2. **Etimad partnership** — request official data access via ECEA. 3-6 months negotiation, durable.
3. **User-paste model** — let customers paste Etimad URLs; ingest one at a time. Zero scraping liability.

The scraper is intended as a **bridge** while you pursue (1) or (2). It is not a long-term production strategy.

## Legal note

This module's design — identifying UA, robots.txt respect, conservative rate, audit logging — follows responsible-scraping best practices. **It does not constitute legal advice**. KSA's Anti-Cybercrime Law (2007) and PDPL (2023) may apply. Consult Saudi legal counsel before enabling for production use.
