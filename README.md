# GoalTracker Mini App

Circle Up is a Telegram Mini App for one main goal and up to six daily steps.

## Architecture

- `frontend/` — React/Vite client, deployed under `/goaltracker/`.
- `backend/` — dependency-free Python API with SQLite storage.
- Telegram Mini App `initData` is verified with the bot token before any user
  data is read or written.
- The browser keeps a local cache for offline use; the newest copy is synced to
  the server when the app runs inside Telegram.

## Local checks

```sh
cd frontend
pnpm test
pnpm lint
pnpm exec vite build --base=/goaltracker/

cd ..
python -m unittest discover -s backend -p "test_*.py" -v
```

## Server configuration

The API expects the variables shown in `backend/.env.example`. The real
`TELEGRAM_BOT_TOKEN` must be stored in `/etc/goaltracker.env`, never committed.
The supplied systemd unit runs the service as the unprivileged `goaltracker`
user and writes the SQLite database to `/var/lib/goaltracker/state.db`.
`goaltracker-backup.timer` creates consistent daily backups and retains 14 days.

Nginx proxies `/goaltracker/api/` to `127.0.0.1:8787`; the public health check is
`/goaltracker/api/health`.
### Обращения к разработчикам

В настройках Mini App пользователь Telegram может отправить до пяти сообщений за календарный месяц по UTC. Баг-репорты и обычные обращения делят один лимит. Разработчик с доступом к серверу может прочитать последние 100 обращений командой `sudo -u goaltracker python3 /opt/goaltracker-api/support_inbox.py`. В каждой записи есть номер обращения, время, Telegram ID отправителя, тема и текст.
