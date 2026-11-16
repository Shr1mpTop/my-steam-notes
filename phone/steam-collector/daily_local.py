#!/usr/bin/env python3
"""Daily full sync + enrichment + game updates, on the phone against local SQLite.

Runs from /etc/cron.d/steam-notes at 01:17 Asia/Shanghai (was GitHub Actions
daily_sync.yml UTC 17:17). Chained subprocesses, same scripts as the old
workflow, STEAM_DB_MODE=local routes all DB access to the local SQLite file.
Exit code aggregates every step so cron mail / logs show partial failures.
"""
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta

TZ = timezone(timedelta(hours=8))
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

ENV_CANDIDATES = [
    os.path.join(SCRIPT_DIR, ".env"),
    os.path.join(REPO, ".env"),
]


def load_env():
    for path in ENV_CANDIDATES:
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


STEPS = [
    "scripts/init_turso.py",
    "scripts/sync_turso.py",
    "scripts/sync_enrichment.py",
    "scripts/sync_game_updates.py",
]


def main():
    load_env()
    fallback_proxy = os.getenv("FALLBACK_PROXY", "http://192.168.0.103:7897")
    print(f"=== daily_local start {datetime.now(TZ).isoformat()} (cwd={REPO}) ===", flush=True)
    worst = 0
    for step in STEPS:
        print(f"--- {step} ---", flush=True)
        proc = subprocess.run([sys.executable, step], cwd=REPO, env=os.environ.copy())
        if proc.returncode != 0:
            # store API / Steam API are intermittently throttled from CN —
            # retry the failed step once through the PC Clash proxy
            # (sync_batch state makes reruns resume from where they stopped)
            print(f"--- {step} failed (exit {proc.returncode}) -> retry via proxy {fallback_proxy} ---", flush=True)
            env = os.environ.copy()
            env["HTTPS_PROXY"] = fallback_proxy
            env["HTTP_PROXY"] = fallback_proxy
            proc = subprocess.run([sys.executable, step], cwd=REPO, env=env)
        print(f"--- {step} exit={proc.returncode} ---", flush=True)
        worst = max(worst, proc.returncode)
    print(f"=== daily_local done worst_exit={worst} {datetime.now(TZ).isoformat()} ===", flush=True)
    return worst


if __name__ == "__main__":
    sys.exit(main())
