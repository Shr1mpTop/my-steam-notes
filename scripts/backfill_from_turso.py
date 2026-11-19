"""One-off: backfill status_polls / friend_status_polls from Turso into local fresh.db.

The PC collector only started polling presence on 2026-11-19; the Actions era
wrote the full history into Turso (until the workflow was disabled 2026-11-17).
This script keyset-paginates through Turso and INSERT OR IGNOREs every row into
data/fresh.db, so it is idempotent — safe to re-run any time Turso gets new
history (it won't, but still).

Usage: python scripts/backfill_from_turso.py [--days N]  (default: all history)
"""
import os
import sqlite3
import sys
import time

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRESH_DB = os.path.join(REPO, "data", "fresh.db")
PROXY = os.getenv("BACKFILL_PROXY", "http://127.0.0.1:7897")

# --- env: Turso creds live in phone/steam-collector/.env
env_path = os.path.join(REPO, "phone", "steam-collector", ".env")
with open(env_path, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())
os.environ["STEAM_DB_MODE"] = "turso"
os.environ["HTTPS_PROXY"] = PROXY
os.environ["HTTP_PROXY"] = PROXY

sys.path.insert(0, REPO)
from scripts import turso_db as t  # noqa: E402

BATCH = 2000

TABLES = {
    "status_polls": {
        "cols": ["timestamp", "personastate", "gameextrainfo", "gameid"],
        "key": ["timestamp"],
    },
    "friend_status_polls": {
        "cols": ["timestamp", "steamid", "personaname", "personastate",
                 "gameextrainfo", "gameid", "lastlogoff", "avatarfull", "profileurl"],
        "key": ["timestamp", "steamid"],
    },
}


def keyset_where(key, lo_vals):
    """WHERE clause advancing a composite keyset strictly past lo_vals."""
    if not lo_vals:
        return "", []
    clauses, args = [], []
    for i in range(len(key)):
        clause = " AND ".join(
            f"{k} = ?" for k in key[:i]) + (" AND " if i else "") + f"{key[i]} > ?"
        clauses.append(clause)
        args.extend(lo_vals[:i] + [lo_vals[i]])
    return "(" + " OR ".join(clauses) + ")", args


def fetch_retry(sql, args, attempts=5):
    """Turso-over-Clash occasionally drops SSL mid-run; retry with backoff."""
    last = None
    for i in range(attempts):
        try:
            return t.execute(sql, args)
        except Exception as exc:  # noqa: BLE001 — transient network errors only
            last = exc
            wait = 2 * (i + 1)
            print(f"  transient error ({type(exc).__name__}), retry in {wait}s", flush=True)
            time.sleep(wait)
    raise last


def backfill_table(name, spec, since):
    local = sqlite3.connect(FRESH_DB, timeout=30)
    local.row_factory = sqlite3.Row
    cols = spec["cols"]
    key = spec["key"]
    where, wargs = "", []
    if since:
        where = f"WHERE {key[0]} >= ?"
        wargs = [since]
    inserted = 0
    lo = None
    n_rows_local_before = local.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
    print(f"[{name}] local rows before: {n_rows_local_before}", flush=True)
    while True:
        kw, ka = keyset_where(key, lo) if lo else ("", [])
        sql = (f"SELECT {', '.join(cols)} FROM {name} {where} "
               + (f"{'AND' if where else 'WHERE'} {kw} " if kw else "")
               + f"ORDER BY {', '.join(key)} LIMIT {BATCH}")
        rows = fetch_retry(" ".join(sql.split()), (wargs + ka) or None)
        if not rows:
            break
        placeholders = ", ".join("?" for _ in cols)
        local.executemany(
            f"INSERT OR IGNORE INTO {name} ({', '.join(cols)}) VALUES ({placeholders})",
            [tuple(r[c] for c in cols) for r in rows],
        )
        local.commit()
        inserted += len(rows)
        lo = [rows[-1][k] for k in key]
        print(f"[{name}] fetched {inserted} rows, at {lo[0]}", flush=True)
        if len(rows) < BATCH:
            break
        time.sleep(0.05)
    n_after = local.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
    local.close()
    print(f"[{name}] DONE: fetched {inserted}, local {n_rows_local_before} -> {n_after}", flush=True)


if __name__ == "__main__":
    days = None
    if "--days" in sys.argv:
        days = sys.argv[sys.argv.index("--days") + 1]
        from datetime import datetime, timedelta, timezone
        tz = timezone(timedelta(hours=8))
        days = (datetime.now(tz) - timedelta(days=int(days))).isoformat()
        print(f"backfilling only rows newer than {days}", flush=True)
    for name, spec in TABLES.items():
        backfill_table(name, spec, days)
    print("backfill complete", flush=True)
