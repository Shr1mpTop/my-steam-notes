#!/bin/bash
# my-steam-notes installer — run INSIDE proot Debian on the M11P phone.
# Called from PC via deploy.ps1:
#   proot-distro login debian --shared-tmp -- bash /sdcard/steam-notes-install.sh
# Idempotent: safe to re-run on every deploy.
set -euo pipefail

APP=/root/steam-notes
STAGE=/sdcard/steam-notes-staging
LOGS=/root/logs

mkdir -p "$APP" "$LOGS" /root/www-static/steam

# 1) clean-copy code (authoritative source = PC repo, tarred by deploy.ps1)
rm -rf "$APP/scripts" "$APP/phone"
cp -r "$STAGE/scripts" "$APP/scripts"
cp -r "$STAGE/phone" "$APP/phone"

# 2) fix CRLF from Windows tar
find "$APP" \( -name '*.py' -o -name '*.sh' -o -name '*.conf' \) -exec sed -i 's/\r$//' {} +

# 3) secrets: expect .env staged at $STAGE/env
if [ -f "$STAGE/env" ]; then
  cp "$STAGE/env" "$APP/phone/steam-collector/.env"
fi
if [ ! -f "$APP/phone/steam-collector/.env" ]; then
  echo "WARN: no .env staged; collector will exit(2) until secrets are deployed"
fi
chmod 600 "$APP/phone/steam-collector/.env" 2>/dev/null || true
# repo-root copy so scripts/cron (load_dotenv from cwd) also see secrets
cp "$APP/phone/steam-collector/.env" "$APP/.env" 2>/dev/null || true
chmod 600 "$APP/.env" 2>/dev/null || true

# 3.5) cron: daily sync at 01:17 (replaces GitHub Actions daily_sync.yml)
cp "$APP/phone/steam-collector/cron-steam-notes" /etc/cron.d/steam-notes
chmod 644 /etc/cron.d/steam-notes

# 3.55) nginx: matrix app server conf (8082) — version-controlled since review round
if [ -f "$APP/phone/steam-collector/nginx-steam-app.conf" ]; then
  cp "$APP/phone/steam-collector/nginx-steam-app.conf" /etc/nginx/sites-enabled/steam-app
  nginx -t && nginx -s reload || timeout 20 supervisorctl restart nginx
fi

# 4) venv (PEP 668 blocks system pip; venv = Buffotte precedent)
if [ ! -x "$APP/venv/bin/python3" ]; then
  python3 -m venv "$APP/venv"
fi
"$APP/venv/bin/pip" install -q -i https://pypi.tuna.tsinghua.edu.cn/simple requests python-dotenv

# 4.5) database: staged steam.db -> LIVE location inside proot (/root = ext4-backed,
#      avoids /sdcard FUSE cross-layer caching that bit us on first deploy).
#      A live db with data is NEVER overwritten by a redeploy.
DB_LIVE=/root/steam-notes/data/steam.db
mkdir -p /root/steam-notes/data
if [ -f "$STAGE/steam.db" ]; then
  if [ -f "$DB_LIVE" ] && "$APP/venv/bin/python3" -c "
import sqlite3,sys
c=sqlite3.connect('$DB_LIVE')
n=c.execute('SELECT COUNT(*) FROM owned_games').fetchone()[0]
sys.exit(0 if n>0 else 1)
" 2>/dev/null; then
    echo "live db already has data -> preserved, staged copy ignored"
  else
    cp "$STAGE/steam.db" "$DB_LIVE"
    sync
    "$APP/venv/bin/python3" -c "
import sqlite3
c = sqlite3.connect('$DB_LIVE')
ok = c.execute('PRAGMA quick_check').fetchone()[0]
n = c.execute('SELECT COUNT(*) FROM owned_games').fetchone()[0]
s = c.execute('SELECT COUNT(*) FROM status_polls').fetchone()[0]
assert ok == 'ok', f'quick_check: {ok}'
print(f'db installed: quick_check=ok owned_games={n} status_polls={s} size=$(du -h $DB_LIVE | cut -f1)')
"
  fi
fi
ls -la "$DB_LIVE" 2>/dev/null || echo "WARN: no db at $DB_LIVE — collector will warn & self-heal"

# 4.6) matrix terminal -> www-app (served at steam.zhili-he.top root)
mkdir -p /root/steam-notes/www-app
cp "$APP/phone/steam-collector/terminal-index.html" /root/steam-notes/www-app/index.html

# 5) supervisord program
cp "$APP/phone/steam-collector/supervisord-steam-notes.conf" /etc/supervisor/conf.d/steam-notes.conf
timeout 20 supervisorctl reread || true
timeout 20 supervisorctl update || true
timeout 20 supervisorctl restart steam-collector steam-dashboard steam-api || true
# restart can race with a freshly-added program; make sure everything is up
timeout 20 supervisorctl start steam-api 2>/dev/null || true

# 6) wipe staging (tar copies of secrets/db must not linger on /sdcard)
rm -rf "$STAGE" /sdcard/steam-notes-deploy.tgz 2>/dev/null || true

sleep 4
echo "===== status ====="
timeout 20 supervisorctl status | grep -E 'steam' || echo "(no steam programs visible)"
echo "===== collector log tail ====="
tail -n 15 "$LOGS/steam-collector.log" 2>/dev/null || true
echo "===== dashboard log tail ====="
tail -n 8 "$LOGS/steam-dashboard.log" 2>/dev/null || true
echo "===== api log tail ====="
tail -n 5 "$LOGS/steam-api.log" 2>/dev/null || true
