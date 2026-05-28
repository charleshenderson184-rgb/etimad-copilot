#!/usr/bin/env python3
"""CLI runner for the Etimad scraper.

Usage:
    # Set the feature flag and run
    ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py

    # Override request cap
    ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py --max-pages 3

For cron (daily at 6am Riyadh time = 3am UTC):
    0 3 * * *  cd /app && ETIMAD_SCRAPER_ENABLED=true python scripts/scrape_etimad.py >> /var/log/etimad-scraper.log 2>&1
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

# Make app importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.etimad_scraper import EtimadScraper  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Scrape Etimad public tenders.")
    parser.add_argument("--max-pages", type=int, default=5, help="Max listing pages to crawl")
    parser.add_argument(
        "--listing-path",
        type=str,
        default="/Tender/AllTendersForVisitor",
        help="Etimad listing path to crawl",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Verbose logging"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    if os.getenv("ETIMAD_SCRAPER_ENABLED", "false").lower() not in ("true", "1", "yes"):
        print(
            "ERROR: Etimad scraper is disabled. "
            "Set ETIMAD_SCRAPER_ENABLED=true to enable.",
            file=sys.stderr,
        )
        print(
            "Before enabling, read Etimad ToS at https://tenders.etimad.sa "
            "and ensure compliance.",
            file=sys.stderr,
        )
        sys.exit(2)

    scraper = EtimadScraper()
    result = asyncio.run(scraper.run(listing_path=args.listing_path, max_pages=args.max_pages))

    print(result.summary())
    if result.errors:
        print(f"\nErrors ({len(result.errors)}):")
        for err in result.errors[:10]:
            print(f"  - {err}")
        if len(result.errors) > 10:
            print(f"  ... and {len(result.errors) - 10} more")

    sys.exit(0 if not result.errors else 1)


if __name__ == "__main__":
    main()
