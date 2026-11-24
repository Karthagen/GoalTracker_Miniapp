"""Read the most recent developer messages on the server (one JSON record per line)."""

import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path


if __name__ == "__main__":
    path = Path(os.environ.get("GOALTRACKER_DB", "/var/lib/goaltracker/state.db"))
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        db.row_factory = sqlite3.Row
        for row in db.execute(
            "SELECT id, created_at, user_id, kind, message FROM support_messages ORDER BY id DESC LIMIT 100"
        ):
            print(json.dumps(dict(row), ensure_ascii=False))
