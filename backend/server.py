#!/usr/bin/env python3
"""Small authenticated storage API for the Circle Up Telegram Mini App."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import time
import threading
from urllib.request import Request, urlopen
from contextlib import closing
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl
from uuid import UUID


MAX_BODY_BYTES = 256 * 1024
MONTHLY_LIMIT = 5


class QuotaReached(Exception):
    pass


class AuthError(ValueError):
    pass


@dataclass(frozen=True)
class TelegramUser:
    id: int


def verify_telegram_init_data(
    init_data: str,
    bot_token: str,
    *,
    now: int | None = None,
    max_age_seconds: int = 7 * 24 * 60 * 60,
) -> TelegramUser:
    if not init_data or len(init_data) > 16_384:
        raise AuthError("Missing Telegram init data")

    pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=True)
    if len({key for key, _ in pairs}) != len(pairs):
        raise AuthError("Duplicate Telegram init data field")
    fields = dict(pairs)
    received_hash = fields.pop("hash", "")
    if len(received_hash) != 64:
        raise AuthError("Invalid Telegram signature")

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(fields.items())
    )
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise AuthError("Invalid Telegram signature")

    current_time = int(time.time()) if now is None else now
    try:
        auth_date = int(fields["auth_date"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AuthError("Invalid Telegram auth date") from exc
    if auth_date > current_time + 300 or current_time - auth_date > max_age_seconds:
        raise AuthError("Expired Telegram init data")

    try:
        raw_user = json.loads(fields["user"])
        user_id = int(raw_user["id"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise AuthError("Invalid Telegram user") from exc
    if user_id <= 0:
        raise AuthError("Invalid Telegram user")
    return TelegramUser(id=user_id)


class StateStore:
    def __init__(self, path: str | Path):
        self.path = str(path)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _initialize(self) -> None:
        with closing(self._connect()) as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS user_states (
                    telegram_user_id INTEGER PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    client_updated_at INTEGER NOT NULL,
                    server_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute("""
                CREATE TABLE IF NOT EXISTS support_messages (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    request_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, request_id)
                )
            """)
            connection.execute("CREATE INDEX IF NOT EXISTS support_by_month ON support_messages(user_id, created_at)")
            connection.execute("""
                CREATE TABLE IF NOT EXISTS support_deliveries (
                    ticket INTEGER PRIMARY KEY,
                    telegram_message_id INTEGER NOT NULL
                )
            """)
            connection.commit()

    @staticmethod
    def _remaining(connection, user_id):
        used = connection.execute("""
            SELECT count(*) FROM support_messages
            WHERE user_id = ? AND created_at >= datetime('now', 'start of month')
        """, (user_id,)).fetchone()[0]
        return max(0, MONTHLY_LIMIT - used)

    def remaining(self, user_id):
        with closing(self._connect()) as connection:
            return self._remaining(connection, user_id)

    def submit(self, user_id, payload):
        kind = payload.get("kind")
        message = payload.get("message")
        request_id = str(UUID(str(payload.get("requestId"))))
        if kind not in ("bug", "contact") or not isinstance(message, str) or not 1 <= len(message.strip()) <= 2000:
            raise ValueError("Invalid feedback")
        with closing(self._connect()) as connection:
            connection.execute("BEGIN IMMEDIATE")
            remaining = self._remaining(connection, user_id)
            existing = connection.execute(
                "SELECT id, kind, message FROM support_messages WHERE user_id=? AND request_id=?",
                (user_id, request_id),
            ).fetchone()
            if existing:
                if (existing["kind"], existing["message"]) != (kind, message.strip()):
                    raise ValueError("Request already used")
                return {"ticket": existing["id"], "remaining": remaining}
            if not remaining:
                raise QuotaReached()
            ticket = connection.execute(
                "INSERT INTO support_messages(user_id, request_id, kind, message) VALUES (?, ?, ?, ?)",
                (user_id, request_id, kind, message.strip()),
            ).lastrowid
            connection.commit()
            return {"ticket": ticket, "remaining": remaining - 1}

    def get(self, user_id: int) -> dict[str, Any] | None:
        with closing(self._connect()) as connection:
            row = connection.execute(
                """
                SELECT state_json, client_updated_at, server_updated_at
                FROM user_states
                WHERE telegram_user_id = ?
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "state": json.loads(row["state_json"]),
            "updatedAt": row["client_updated_at"],
            "serverUpdatedAt": row["server_updated_at"],
        }

    def save(self, user_id: int, state: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        updated_at = state.get("updatedAt")
        if not isinstance(updated_at, int) or updated_at <= 0:
            raise ValueError("State must contain a positive updatedAt timestamp")
        encoded = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > MAX_BODY_BYTES:
            raise ValueError("State is too large")

        with closing(self._connect()) as connection:
            cursor = connection.execute(
                """
                INSERT INTO user_states (
                    telegram_user_id, state_json, client_updated_at, server_updated_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(telegram_user_id) DO UPDATE SET
                    state_json = excluded.state_json,
                    client_updated_at = excluded.client_updated_at,
                    server_updated_at = CURRENT_TIMESTAMP
                WHERE excluded.client_updated_at >= user_states.client_updated_at
                """,
                (user_id, encoded, updated_at),
            )
            saved = cursor.rowcount > 0
            connection.commit()
        current = self.get(user_id)
        if current is None:
            raise RuntimeError("State disappeared after saving")
        return saved, current


def deliver_notifications(store, token, chat_id):
    while True:
        try:
            with closing(store._connect()) as db:
                row = db.execute("""
                    SELECT s.id, s.kind, s.message FROM support_messages AS s
                    LEFT JOIN support_deliveries AS d ON d.ticket=s.id
                    WHERE d.ticket IS NULL ORDER BY s.id LIMIT 1
                """).fetchone()
                if row is not None:
                    topic = "Ошибка" if row["kind"] == "bug" else "Обращение"
                    text = f"{topic} №{row['id']} · Circle Up\n\n{row['message']}"
                    req = Request(f"https://api.telegram.org/bot{token}/sendMessage",
                                  data=json.dumps({"chat_id": chat_id, "text": text,
                                                   "link_preview_options": {"is_disabled": True}}).encode(),
                                  headers={"Content-Type": "application/json"})
                    with urlopen(req, timeout=10) as response:
                        message_id = json.load(response)["result"]["message_id"]
                    db.execute("INSERT INTO support_deliveries VALUES (?, ?)", (row["id"], message_id))
                    db.commit()
            time.sleep(2 if row is not None else 5)
        except Exception as exc:
            print(f"Support notification deferred: {type(exc).__name__}", flush=True)
            time.sleep(60)


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "CircleUpAPI/1"

    @property
    def config(self) -> dict[str, Any]:
        return self.server.config  # type: ignore[attr-defined]

    def _send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(encoded)

    def _authenticate(self) -> TelegramUser:
        return verify_telegram_init_data(
            self.headers.get("X-Telegram-Init-Data", ""),
            self.config["bot_token"],
            max_age_seconds=self.config["max_auth_age"],
        )

    def _read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid content length") from exc
        if length <= 0 or length > MAX_BODY_BYTES:
            raise ValueError("Invalid request size")
        try:
            payload = json.loads(self.rfile.read(length))
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON") from exc
        if not isinstance(payload, dict):
            raise ValueError("JSON object required")
        return payload

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(HTTPStatus.OK, {"status": "ok"})
            return
        if self.path not in ("/state", "/support"):
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        try:
            user = self._authenticate()
            if self.path == "/support":
                self._send_json(HTTPStatus.OK, {"remaining": self.config["store"].remaining(user.id)})
                return
            record = self.config["store"].get(user.id)
        except AuthError:
            self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return
        self._send_json(HTTPStatus.OK, record or {"state": None})

    def do_POST(self) -> None:
        if self.path != "/support":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        try:
            user = self._authenticate()
            receipt = self.config["store"].submit(user.id, self._read_json())
        except AuthError:
            self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return
        except QuotaReached:
            self._send_json(HTTPStatus.TOO_MANY_REQUESTS, {"remaining": 0})
            return
        except ValueError:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
            return
        self._send_json(HTTPStatus.OK, receipt)

    def do_PUT(self) -> None:
        if self.path != "/state":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        try:
            user = self._authenticate()
            payload = self._read_json()
            state = payload.get("state")
            if not isinstance(state, dict):
                raise ValueError("State object required")
            saved, current = self.config["store"].save(user.id, state)
        except AuthError:
            self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return
        except ValueError as exc:
            self._send_json(
                HTTPStatus.BAD_REQUEST, {"error": "invalid_request", "message": str(exc)}
            )
            return
        self._send_json(HTTPStatus.OK if saved else HTTPStatus.CONFLICT, current)

    def log_message(self, message: str, *args: Any) -> None:
        print(
            f'{self.address_string()} - - [{self.log_date_time_string()}] {message % args}',
            flush=True,
        )


def main() -> None:
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is required")
    db_path = Path(os.environ.get("GOALTRACKER_DB", "/var/lib/goaltracker/state.db"))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    host = os.environ.get("GOALTRACKER_HOST", "127.0.0.1")
    port = int(os.environ.get("GOALTRACKER_PORT", "8787"))
    max_auth_age = int(os.environ.get("TELEGRAM_AUTH_MAX_AGE", str(7 * 86400)))

    server = ThreadingHTTPServer((host, port), ApiHandler)
    server.config = {  # type: ignore[attr-defined]
        "bot_token": bot_token,
        "max_auth_age": max_auth_age,
        "store": StateStore(db_path),
    }
    chat_id = os.environ.get("GOALTRACKER_SUPPORT_CHAT_ID", "").strip()
    if chat_id:
        threading.Thread(target=deliver_notifications,
                         args=(server.config["store"], bot_token, chat_id), daemon=True).start()
    print(f"Circle Up API listening on {host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
