import hashlib
import hmac
import json
import tempfile
import time
import unittest
from pathlib import Path
from urllib.parse import urlencode

from server import AuthError, StateStore, verify_telegram_init_data


def signed_init_data(token: str, user_id: int, auth_date: int) -> str:
    fields = {
        "auth_date": str(auth_date),
        "query_id": "test-query",
        "user": json.dumps({"id": user_id}, separators=(",", ":")),
    }
    check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


class AuthTests(unittest.TestCase):
    def test_accepts_valid_telegram_signature(self):
        now = int(time.time())
        data = signed_init_data("123:test", 42, now)
        self.assertEqual(
            verify_telegram_init_data(data, "123:test", now=now).id,
            42,
        )

    def test_rejects_tampering_and_expired_data(self):
        now = int(time.time())
        data = signed_init_data("123:test", 42, now)
        with self.assertRaises(AuthError):
            verify_telegram_init_data(data.replace("42", "43"), "123:test", now=now)
        old = signed_init_data("123:test", 42, now - 1000)
        with self.assertRaises(AuthError):
            verify_telegram_init_data(
                old, "123:test", now=now, max_age_seconds=100
            )


class StoreTests(unittest.TestCase):
    def test_latest_state_wins_and_stale_write_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            store = StateStore(Path(directory) / "state.db")
            saved, current = store.save(7, {"version": 3, "updatedAt": 200})
            self.assertTrue(saved)
            self.assertEqual(current["state"]["updatedAt"], 200)

            saved, current = store.save(7, {"version": 3, "updatedAt": 100})
            self.assertFalse(saved)
            self.assertEqual(current["state"]["updatedAt"], 200)


if __name__ == "__main__":
    unittest.main()
