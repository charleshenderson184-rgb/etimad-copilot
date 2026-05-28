"""Deploy-safe DB bootstrap.

Strategy:
1. If the alembic_version table doesn't exist (or is empty), we treat this as
   a brand-new database: create all tables via SQLModel.metadata.create_all,
   then stamp alembic to head. Future migrations run incrementally.
2. If alembic_version exists with a revision, run `alembic upgrade head`
   normally to apply any new migrations.

This sidesteps the fact that the initial migration was historically generated
against an existing SQLite DB and contains alter_column statements that don't
work against an empty database. It's also faster than running every migration
on first deploy.

Run this once before starting uvicorn:
    python scripts/bootstrap_db.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import inspect  # noqa: E402
from sqlmodel import SQLModel, create_engine  # noqa: E402

from app import models  # noqa: F401, E402  — registers all tables
from app.config import settings  # noqa: E402


def main() -> None:
    engine = create_engine(settings.database_url, echo=False)
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())

    alembic_cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    fresh = "alembic_version" not in existing

    if fresh:
        print("[bootstrap_db] No alembic_version table — treating as fresh DB.")
        SQLModel.metadata.create_all(engine)
        print(f"[bootstrap_db] Created {len(SQLModel.metadata.tables)} tables.")
        command.stamp(alembic_cfg, "head")
        print("[bootstrap_db] Stamped alembic to head.")
    else:
        print("[bootstrap_db] Existing DB detected — running incremental migrations.")
        command.upgrade(alembic_cfg, "head")
        print("[bootstrap_db] alembic upgrade head complete.")


if __name__ == "__main__":
    main()
