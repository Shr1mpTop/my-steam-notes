"""Data access layer for my-steam-notes scripts.

Two backends, selected by env STEAM_DB_MODE:
  - "turso"  (default): HTTP pipeline API against Turso (GitHub Actions, PC).
  - "local"           : sqlite3 file on this machine (M11P phone production,
                        STEAM_DB_PATH, default /sdcard/steam-notes/steam.db).

Same execute()/execute_many() signatures and SQLite dialect for both, so every
sync/build script runs unchanged against either backend.
"""
import os
import sqlite3
import threading

import requests as http_requests
from dotenv import load_dotenv

load_dotenv()

MODE = os.getenv("STEAM_DB_MODE", "turso").strip().lower()
DB_PATH = os.getenv("STEAM_DB_PATH", "/sdcard/steam-notes/steam.db")

# ---------------------------------------------------------------- local sqlite
_SQLITE_LOCK = threading.Lock()
_SQLITE_CONN = None


def _sqlite_conn():
    global _SQLITE_CONN
    if _SQLITE_CONN is None:
        d = os.path.dirname(DB_PATH)
        if d:
            os.makedirs(d, exist_ok=True)
        _SQLITE_CONN = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
        _SQLITE_CONN.row_factory = sqlite3.Row
        _SQLITE_CONN.execute("PRAGMA journal_mode=WAL")
        _SQLITE_CONN.execute("PRAGMA busy_timeout=30000")
        _SQLITE_CONN.execute("PRAGMA foreign_keys=ON")
    return _SQLITE_CONN


def _local_execute(sql, args=None):
    with _SQLITE_LOCK:
        cur = _sqlite_conn().execute(sql, tuple(args) if args else ())
        rows = [dict(r) for r in cur.fetchall()]
        _SQLITE_CONN.commit()
        return rows


def _local_execute_many(sql, args_list):
    if not args_list:
        return []
    with _SQLITE_LOCK:
        conn = _sqlite_conn()
        conn.executemany(sql, [tuple(a) for a in args_list])
        conn.commit()
    return []


# ---------------------------------------------------------------- turso http
raw = os.getenv("TURSO_URL", "").strip()
TURSO_URL = raw.replace("libsql://", "https://") if raw.startswith("libsql://") else f"https://{raw}" if raw and not raw.startswith("http") else raw
TURSO_TOKEN = os.getenv("TURSO_TOKEN")

HEADERS = {
    "Authorization": f"Bearer {TURSO_TOKEN}",
    "Content-Type": "application/json",
}


def _fmt_arg(val):
    """Format a Python value into a libsql pipeline API arg object."""
    if val is None:
        return {"type": "null"}
    if isinstance(val, bool):
        return {"type": "integer", "value": str(int(val))}
    if isinstance(val, int):
        return {"type": "integer", "value": str(val)}
    if isinstance(val, float):
        return {"type": "float", "value": str(val)}
    return {"type": "text", "value": str(val)}


def _turso_execute(sql, args=None):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [_fmt_arg(a) for a in args]
    resp = http_requests.post(
        f"{TURSO_URL}/v2/pipeline",
        headers=HEADERS,
        json={"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]},
        timeout=30,
    )
    if not resp.ok:
        print(f"Turso error {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    results = resp.json()["results"]
    for r in results:
        if r["type"] == "ok" and r["response"]["type"] == "execute":
            result = r["response"]["result"]
            cols = [c["name"] for c in result["cols"]]
            rows = []
            for row in result["rows"]:
                values = []
                for cell in row:
                    if cell["type"] == "null":
                        values.append(None)
                    elif cell["type"] == "integer":
                        values.append(int(cell["value"]))
                    else:
                        values.append(cell["value"])
                rows.append(dict(zip(cols, values)))
            return rows
    return []


def _turso_execute_many(sql, args_list):
    requests_list = []
    for args in args_list:
        requests_list.append({
            "type": "execute",
            "stmt": {"sql": sql, "args": [_fmt_arg(a) for a in args]},
        })
    requests_list.append({"type": "close"})

    resp = http_requests.post(
        f"{TURSO_URL}/v2/pipeline",
        headers=HEADERS,
        json={"requests": requests_list},
        timeout=60,
    )
    if not resp.ok:
        print(f"Turso error {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    return resp.json()["results"]


# ---------------------------------------------------------------- public API
def using_local():
    return MODE == "local"


def execute(sql: str, args=None):
    """Execute a single SQL statement. Returns list of rows as dicts."""
    if MODE == "local":
        return _local_execute(sql, args)
    return _turso_execute(sql, args)


def execute_many(sql: str, args_list: list):
    """Execute multiple statements with different args in one batch."""
    if MODE == "local":
        return _local_execute_many(sql, args_list)
    if not args_list:
        return []
    return _turso_execute_many(sql, args_list)
