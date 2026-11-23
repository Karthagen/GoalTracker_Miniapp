import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from backup import main


class BackupTests(unittest.TestCase):
    def test_creates_a_readable_consistent_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / "state.db"
            backup_dir = root / "backups"
            with closing(sqlite3.connect(database)) as connection:
                connection.execute("CREATE TABLE values_table (value TEXT)")
                connection.execute("INSERT INTO values_table VALUES ('saved')")
                connection.commit()

            with patch.dict(
                os.environ,
                {
                    "GOALTRACKER_DB": str(database),
                    "GOALTRACKER_BACKUP_DIR": str(backup_dir),
                    "GOALTRACKER_BACKUP_DAYS": "14",
                },
            ):
                main()

            backups = list(backup_dir.glob("state-*.db"))
            self.assertEqual(len(backups), 1)
            with closing(sqlite3.connect(backups[0])) as connection:
                value = connection.execute(
                    "SELECT value FROM values_table"
                ).fetchone()[0]
            self.assertEqual(value, "saved")


if __name__ == "__main__":
    unittest.main()
