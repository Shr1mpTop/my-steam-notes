#!/usr/bin/env python3
"""Migrate the Turso cloud DB to a local SQLite file.

Runs on the PC (Turso is GFW-blocked from the phone; PC reaches it via the
Clash proxy). Copies schema verbatim from sqlite_master, then rows table by
table with rowid keyset pagination, and verifies per-table counts.

Usage:
  python migrate_turso_to_sqlite.py --out C:\\temp\\steam.db
  python migrate_turso_to_sqlite.py --out C:\\temp\\steam.db --no-proxy
Proxy defaults to http://127.0.0.1:7897 (Clash). Reads TURSO_URL / TURSO_TOKEN
from the sibling .env.
"""
import argparse
import json
import os
import sys
import time

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BATCH = 500


def load_env():
    path = os.path.join(SCRIPT_DIR, ".env")
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def turso_url():
    raw = os.getenv("TURSO_URL", "").strip()
    if raw.startswith("libsql://"):
        raw = raw.replace("libsql://", "https://", 1)
    elif raw and not raw.startswith("http"):
        raw = f"https://{raw}"
    return raw


class Turso:
    def __init__(self, base, token, proxies):
        self.base = base
        self.session = requests.Session()
        if proxies:
            self.session.proxies = {"http": proxies, "https": proxies}
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def pipeline(self, stmts, retries=5):
        body = {"requests": []}
        for sql, args in stmts:
            st = {"sql": sql}
            if args:
                st["args"] = [{"type": "null" if a is None else
                               "integer" if isinstance(a, int) else
                               "float" if isinstance(a, float) else "text",
                               "value": str(a)} for a in args]
            body["requests"].append({"type": "execute", "stmt": st})
        body["requests"].append({"type": "close"})
        last = None
        for attempt in range(retries):
            try:
                resp = self.session.post(f"{self.base}/v2/pipeline", headers=self.headers,
                                         json=body, timeout=60)
                if resp.status_code == 200:
                    return resp.json().get("results", [])
                last = f"HTTP {resp.status_code}: {resp.text[:200]}"
            except requests.RequestException as exc:
                last = str(exc)
            time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"Turso pipeline failed after {retries} attempts: {last}")

    def query(self, sql, args=None):
        for r in self.pipeline([(sql, args)]):
            if r.get("type") != "ok":
                raise RuntimeError(f"Turso stmt error: {str(r.get('error'))[:200]}")
            resp = r.get("response", {})
            if resp.get("type") != "execute":
                continue
            result = resp.get("result", {})
            cols = [c["name"] for c in result.get("cols", [])]
            rows = []
            for row in result.get("rows", []):
                values = []
                for cell in row:
                    t = cell.get("type")
                    if t == "null":
                        values.append(None)
                    elif t == "integer":
                        values.append(int(cell["value"]))
                    elif t == "float":
                        values.append(float(cell["value"]))
                    else:
                        values.append(cell.get("value"))
                rows.append(dict(zip(cols, values)))
            return rows
        return []

    def count(self, table):
        rows = self.query(f'SELECT COUNT(*) AS n FROM "{table}"')
        return rows[0]["n"] if rows else 0

    def iter_rows(self, table):
        last = 0
        while True:
            rows = self.query(f'SELECT rowid AS __rid, * FROM "{table}" WHERE rowid > ? ORDER BY rowid LIMIT ?',
                              [last, BATCH])
            if not rows:
                return
            for r in rows:
                last = r["__rid"]
                r.pop("__rid", None)
            yield rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="output sqlite file path")
    ap.add_argument("--proxy", default=os.getenv("TURSO_PROXY", "http://127.0.0.1:7897"))
    ap.add_argument("--no-proxy", action="store_true")
    ap.add_argument("--force", action="store_true", help="overwrite an existing output file")
    args = ap.parse_args()

    load_env()
    base = turso_url()
    token = os.getenv("TURSO_TOKEN", "")
    if not base or not token:
        print("FATAL: TURSO_URL / TURSO_TOKEN missing"); sys.exit(2)

    proxies = None if args.no_proxy else (args.proxy or None)
    src = Turso(base, token, proxies)
    print(f"source: {base}  proxy: {proxies or 'DIRECT'}")

    if os.path.exists(args.out):
        if not args.force:
            print(f"refusing to overwrite {args.out} (use --force)"); sys.exit(1)
        os.remove(args.out)
    for suf in ("-wal", "-shm"):
        if os.path.exists(args.out + suf):
            os.remove(args.out + suf)

    import sqlite3
    conn = sqlite3.connect(args.out)
    conn.execute("PRAGMA journal_mode=WAL")

    # 1) schema verbatim from sqlite_master (tables first, then indexes/views/triggers)
    objs = src.query(
        """SELECT type, name, sql FROM sqlite_master
           WHERE sql IS NOT NULL
             AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' AND name NOT LIKE '_cf_%'
           ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name"""
    )
    print(f"schema objects: {len(objs)}")
    for o in objs:
        conn.execute(o["sql"])
    conn.commit()

    tables = [o["name"] for o in objs if o["type"] == "table"]
    print("tables:", ", ".join(tables))

    # 2) rows
    t0 = time.time()
    total = 0
    report = []
    for t in tables:
        n_src = src.count(t)
        copied = 0
        for rows in src.iter_rows(t):
            if rows:
                cols = [c for c in rows[0].keys()]
                placeholders = ",".join("?" for _ in cols)
                collist = ",".join(f'"{c}"' for c in cols)
                conn.executemany(
                    f'INSERT OR REPLACE INTO "{t}" ({collist}) VALUES ({placeholders})',
                    [tuple(r[c] for c in cols) for r in rows],
                )
                copied += len(rows)
                if copied % 10000 < BATCH:
                    print(f"  {t}: {copied}/{n_src}")
        conn.commit()
        n_dst = conn.execute(f'SELECT COUNT(*) AS n FROM "{t}"').fetchone()[0]
        ok = "OK" if n_dst == n_src else "MISMATCH"
        report.append((t, n_src, n_dst, ok))
        total += copied
        print(f"  {t}: src={n_src} dst={n_dst} {ok}")
    conn.close()

    size_mb = os.path.getsize(args.out) / 1e6
    print(f"\nmigrated {total} rows in {time.time()-t0:.0f}s -> {args.out} ({size_mb:.1f} MB)")
    bad = [r for r in report if r[3] != "OK"]
    if bad:
        print("VERIFY FAILED:", bad); sys.exit(1)
    print("verify: all table counts match ✓")


if __name__ == "__main__":
    main()
