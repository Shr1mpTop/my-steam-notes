"""
Sync Steam data to Turso.
Fetches: owned games, recent sessions, player info.
Computes daily playtime delta and saves daily snapshots.

Batched execution (DEV-005): each phase is a batch item tracked in
data/sync_batch/sync_turso.json with a pending/success/empty/retry/failed
status. HTTP responses are validated (status code + JSON schema) and DB write
errors are recorded per item instead of crashing silently. Reruns only
process pending/retry/failed (and stale) items unless --all is passed; the
process exits non-zero when any item ends up retry/failed/pending so the
workflow turns red.
"""
import argparse
import os
import sys
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv

sys.path.insert(0, ".")
from scripts.turso_db import execute, execute_many
from scripts.sync_batch import (
    STATUS_EMPTY,
    STATUS_SUCCESS,
    SyncBatch,
    add_cli_args,
    dispatch,
    fetch_json,
    print_failures,
)

load_dotenv()

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
TZ = timezone(timedelta(hours=8))
TODAY = datetime.now(TZ).strftime("%Y-%m-%d")

STEAM_API = "https://api.steampowered.com"

BATCH_SCOPE = "sync_turso"
ITEM_ORDER = ["player_status", "owned_games", "recent_sessions"]

#: per-endpoint JSON schema: dotted paths that must exist / be a list.
#: list_optional=True means a missing list is a legal empty result (e.g. a
#: private profile returns no "games" key) instead of a schema failure.
SCHEMAS = {
    "player_status": {"required": ["response"], "list": "response.players",
                      "list_optional": False},
    "owned_games": {"required": ["response"], "list": "response.games",
                    "list_optional": True},
    "recent_sessions": {"required": ["response"], "list": "response.games",
                        "list_optional": True},
}


def get_json(interface, method, version, params=None, schema=None):
    """Validated Steam Web API fetch: HTTP status gate + JSON schema check.

    Returns (response_object, kind) with kind in {"ok", "empty"}; raises
    TransientFetchError (429/408/5xx, timeout, connection) or
    PermanentFetchError (other non-200, invalid JSON, schema violation).
    """
    url = f"{STEAM_API}/{interface}/{method}/{version}/"
    p = {"key": KEY, "format": "json", **(params or {})}
    data, kind = fetch_json(requests.get, url, params=p, timeout=30, schema=schema)
    return data.get("response") or {}, kind


def sync_player_status(batch=None, item_id="player_status"):
    """Save daily player info snapshot (batch item)."""
    def _process():
        data, kind = get_json("ISteamUser", "GetPlayerSummaries", "v0002",
                              {"steamids": SID}, schema=SCHEMAS["player_status"])
        players = data.get("players", [])
        if kind == STATUS_EMPTY or not players:
            print("No player data returned")
            return STATUS_EMPTY, "no players in response"

        p = players[0]
        execute(
            """INSERT OR REPLACE INTO player_daily (date, personaname, personastate, gameextrainfo, gameid, lastlogoff, loccountrycode)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [TODAY, p.get("personaname", ""), p.get("personastate", 0),
             p.get("gameextrainfo", ""), p.get("gameid", ""),
             p.get("lastlogoff", 0), p.get("loccountrycode", "")],
        )
        print(f"Saved player status for {TODAY}: {p.get('personaname', '?')}")
        return STATUS_SUCCESS, p.get("personaname", "")

    return dispatch(batch, item_id, _process)


def sync_owned_games(batch=None, item_id="owned_games"):
    """Upsert all owned games and refresh today's daily delta (batch item)."""
    def _process():
        data, kind = get_json("IPlayerService", "GetOwnedGames", "v0001", {
            "steamid": SID,
            "include_appinfo": "true",
            "include_played_free_games": "true",
        }, schema=SCHEMAS["owned_games"])
        games = data.get("games", [])
        print(f"Fetched {len(games)} owned games")
        if kind == STATUS_EMPTY or not games:
            return STATUS_EMPTY, "no owned games in response"

        # Upsert owned_games
        now = datetime.now(TZ).isoformat()
        owned_args = [
            [g["appid"], g["name"], g.get("playtime_forever", 0),
             g.get("playtime_windows_forever", 0), g.get("playtime_mac_forever", 0),
             g.get("playtime_linux_forever", 0), g.get("playtime_deck_forever", 0),
             g.get("img_icon_url", ""), g.get("rtime_last_played", 0), now]
            for g in games
        ]
        execute_many(
            """INSERT INTO owned_games (appid, name, playtime_forever, playtime_windows_forever,
               playtime_mac_forever, playtime_linux_forever, playtime_deck_forever,
               img_icon_url, rtime_last_played, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(appid) DO UPDATE SET
                 name=excluded.name, playtime_forever=excluded.playtime_forever,
                 playtime_windows_forever=excluded.playtime_windows_forever,
                 playtime_mac_forever=excluded.playtime_mac_forever,
                 playtime_linux_forever=excluded.playtime_linux_forever,
                 playtime_deck_forever=excluded.playtime_deck_forever,
                 img_icon_url=excluded.img_icon_url, rtime_last_played=excluded.rtime_last_played,
                 updated_at=excluded.updated_at""",
            owned_args,
        )
        print("Upserted owned_games")

        # Use the latest snapshot before today as the stable daily baseline.
        prev_rows = execute(
            """SELECT appid, playtime_forever
               FROM daily_snapshots
               WHERE date = (SELECT MAX(date) FROM daily_snapshots WHERE date < ?)""",
            [TODAY],
        )
        prev_map = {r["appid"]: r["playtime_forever"] for r in prev_rows}

        # Upsert today's snapshots so repeated runs reflect the current Steam totals
        # without accumulating duplicate playtime.
        snapshot_args = []
        for g in games:
            appid = g["appid"]
            pt = g.get("playtime_forever", 0)
            delta = max(0, pt - prev_map.get(appid, 0))
            snapshot_args.append([TODAY, appid, g["name"], pt, delta])

        if snapshot_args:
            execute_many(
                """INSERT INTO daily_snapshots (date, appid, name, playtime_forever, daily_playtime)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(date, appid) DO UPDATE SET
                     name=excluded.name,
                     playtime_forever=excluded.playtime_forever,
                     daily_playtime=excluded.daily_playtime""",
                snapshot_args,
            )
            print(f"Upserted {len(snapshot_args)} daily snapshots for {TODAY}")

        return STATUS_SUCCESS, f"{len(games)} games"

    return dispatch(batch, item_id, _process)


def sync_recent_sessions(batch=None, item_id="recent_sessions"):
    """Save recently played games (batch item)."""
    def _process():
        data, kind = get_json("IPlayerService", "GetRecentlyPlayedGames", "v1",
                              {"steamid": SID}, schema=SCHEMAS["recent_sessions"])
        games = data.get("games", [])
        print(f"Fetched {len(games)} recently played games")
        if kind == STATUS_EMPTY or not games:
            return STATUS_EMPTY, "no recently played games"

        args = [
            [TODAY, g["appid"], g["name"], g.get("playtime_2weeks", 0), g.get("playtime_forever", 0)]
            for g in games
        ]
        execute_many(
            """INSERT OR REPLACE INTO recent_sessions (snapshot_date, appid, name, playtime_2weeks, playtime_forever)
               VALUES (?, ?, ?, ?, ?)""",
            args,
        )
        print(f"Saved {len(games)} recent sessions for {TODAY}")
        return STATUS_SUCCESS, f"{len(games)} games"

    return dispatch(batch, item_id, _process)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sync Steam data to Turso (batched)")
    add_cli_args(parser)
    args = parser.parse_args(argv)

    batch = SyncBatch.load_or_create(
        BATCH_SCOPE, ITEM_ORDER, state_dir=args.state_dir,
        stale_hours=args.stale_hours, max_attempts=args.max_attempts,
        force_all=args.force_all,
    )
    print(f"=== Steam Sync {TODAY} ===")
    print(f"[batch {batch.batch_id}] {len(ITEM_ORDER)} items, checkpoint: {batch.path}\n")
    batch.begin_run()

    runners = [
        ("player_status", sync_player_status),
        ("owned_games", sync_owned_games),
        ("recent_sessions", sync_recent_sessions),
    ]
    for item_id, runner in runners:
        if batch.should_run(item_id):
            runner(batch=batch, item_id=item_id)
        else:
            batch.skip(item_id)

    print()
    batch.finish()
    print_failures(batch)
    print(f"\n=== Sync complete ===")
    return batch.exit_code()


if __name__ == "__main__":
    sys.exit(main())
