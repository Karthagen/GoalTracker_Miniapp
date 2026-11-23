#!/usr/bin/env python3
"""Create a consistent SQLite backup and remove expired backup files."""

from __future__ import annotations

import os
import sqlite3
import time
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path


def main() -> None:
    database = Path(os.environ.get("GOALTRACKER_DB", "/var/lib/goaltracker/state.db"))
    backup_dir = Path(
        os.environ.get("GOALTRACKER_BACKUP_DIR", "/var/backups/goaltracker")
    )
    retention_days = int(os.environ.get("GOALTRACKER_BACKUP_DAYS", "14"))
    backup_dir.mkdir(parents=True, exist_ok=True)
    destination = backup_dir / f"state-{datetime.now(UTC):%Y%m%d-%H%M%S}.db"

    with closing(sqlite3.connect(database)) as source, closing(
        sqlite3.connect(destination)
    ) as target:
        source.backup(target)
        target.commit()

    cutoff = time.time() - retention_days * 86400
    for candidate in backup_dir.glob("state-*.db"):
        if candidate.stat().st_mtime < cutoff:
            candidate.unlink()


if __name__ == "__main__":
    main()
