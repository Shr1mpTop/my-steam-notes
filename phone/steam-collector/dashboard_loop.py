#!/usr/bin/env python3
"""Dashboard builder loop for M11P — rebuilds dashboard.json on the phone.

Reads Turso via the repo's scripts/poll_status.py (identical semantics to the
GitHub Actions build), writes the repo copy to data/dashboard.json and
publishes an atomic copy into the static serving dir (default
/root/www-static/steam/dashboard.json) where nginx (8081, CORS) and the LAN
python http.server (8080) can serve it.

Cadence:
  - full rebuild every DASHBOARD_INTERVAL (default 300s)
  - immediate rebuild when the collector touches TRIGGER_FILE (state change)

Turso read-quota note: generate_dashboard scans status_polls (pruned to
RETENTION_SELF_DAYS=45d ~ 65k rows). At 300s cadence that is ~19M row
reads/day (~570M/month) — within the free tier's 1B/month. Lower the interval
only if you also shorten retention.
"""
import os
import shutil
import sys
import time
from datetime import datetime, timezone, timedelta

TZ = timezone(timedelta(hours=8))
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
ENV_CANDIDATES = [
    os.path.join(SCRIPT_DIR, ".env"),
    os.path.join(REPO, "phone", "steam-collector", ".env"),
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
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k:
                    os.environ.setdefault(k, v)


def log(msg):
    print(f"{datetime.now(TZ).isoformat()} {msg}", flush=True)


def build():
    sys.path.insert(0, REPO)
    from scripts.poll_status import generate_dashboard, get_player_summary

    t0 = time.time()
    player = get_player_summary()
    db = generate_dashboard(player)
    repo_json = os.path.join(REPO, "data", "dashboard.json")
    serve_dir = os.getenv("SERVE_DIR", "/root/www-static/steam")
    serve_json = os.path.join(serve_dir, "dashboard.json")
    os.makedirs(serve_dir, exist_ok=True)
    tmp = serve_json + ".tmp"
    shutil.copyfile(repo_json, tmp)
    os.replace(tmp, serve_json)
    log(f"[build] ok: {os.path.getsize(serve_json)} bytes in {time.time() - t0:.1f}s "
        f"(games={len(db['game_cloud'])} source=local-sqlite)")


def main():
    load_env()
    interval = int(os.getenv("DASHBOARD_INTERVAL", "60"))
    trigger = os.getenv("TRIGGER_FILE", os.path.join(REPO, "data", "trigger-rebuild"))
    fallback_proxy = os.getenv("FALLBACK_PROXY", "http://192.168.0.103:7897")
    log(f"=== dashboard loop starting | interval={interval}s | trigger={trigger} | serve={os.getenv('SERVE_DIR', '/root/www-static/steam')} ===")
    last_build = 0.0
    proxy_until = 0.0
    while True:
        now = time.time()
        # revert to direct after 30 min of proxy mode
        if proxy_until and now > proxy_until:
            os.environ.pop("HTTPS_PROXY", None)
            os.environ.pop("HTTP_PROXY", None)
            proxy_until = 0.0
            log("[net] proxy window over -> back to direct")
        due = now - last_build >= interval
        fired = False
        if os.path.isfile(trigger) and os.path.getmtime(trigger) > last_build:
            fired = True
        if due or fired:
            try:
                build()
                last_build = time.time()
                if fired and os.path.isfile(trigger):
                    os.remove(trigger)
            except Exception as exc:
                msg = str(exc)
                netfail = any(k in msg for k in ("HTTPSConnectionPool", "Connection", "Timeout", "timed out", "Max retries"))
                if netfail and not proxy_until:
                    os.environ["HTTPS_PROXY"] = fallback_proxy
                    os.environ["HTTP_PROXY"] = fallback_proxy
                    proxy_until = time.time() + 1800
                    log(f"[net] direct failed ({msg[:120]}) -> proxy mode for 30min")
                    continue  # retry on the next 5s wake-up, via proxy
                log(f"[build] FAILED: {exc} -> retry in 60s")
                # retry sooner than the regular interval, but not hot
                last_build = time.time() - interval + 60
        time.sleep(5)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
