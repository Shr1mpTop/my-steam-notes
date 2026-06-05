"""
Sync Steam data to Turso.
Fetches: owned games, recent sessions, player info.
Computes daily playtime delta and saves daily snapshots.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv

sys.path.insert(0, ".")
from scripts.turso_db import execute, execute_many

load_dotenv()

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
TZ = timezone(timedelta(hours=8))
TODAY = datetime.now(TZ).strftime("%Y-%m-%d")


def get_json(interface, method, version, params=None):
    url = f"https://api.steampowered.com/{interface}/{method}/{version}/"
    p = {"key": KEY, "format": "json", **(params or {})}
    label = f"{interface}/{method}/{version}"
    try:
        resp = requests.get(url, params=p, timeout=30)
        resp.raise_for_status()
        return resp.json().get("response", {})
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        print(f"Steam sync skipped for {label}: HTTP {status}")
    except (requests.RequestException, ValueError) as exc:
        print(f"Steam sync skipped for {label}: {exc}")
    return {}


def sync_owned_games():
    """Upsert all owned games and refresh today's daily delta."""
    data = get_json("IPlayerService", "GetOwnedGames", "v0001", {
        "steamid": SID,
        "include_appinfo": "true",
        "include_played_free_games": "true",
    })
    games = data.get("games", [])
    print(f"Fetched {len(games)} owned games")
    if not games:
        print("Owned games sync skipped: no games returned")
        return

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


def sync_recent_sessions():
    """Save recently played games."""
    data = get_json("IPlayerService", "GetRecentlyPlayedGames", "v1", {"steamid": SID})
    games = data.get("games", [])
    print(f"Fetched {len(games)} recently played games")

    if not games:
        return

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


def sync_player_status():
    """Save daily player info snapshot."""
    data = get_json("ISteamUser", "GetPlayerSummaries", "v0002", {"steamids": SID})
    players = data.get("players", [])

    if not players:
        print("No player data returned")
        return

    p = players[0]
    execute(
        """INSERT OR REPLACE INTO player_daily (date, personaname, personastate, gameextrainfo, gameid, lastlogoff, loccountrycode)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [TODAY, p.get("personaname", ""), p.get("personastate", 0),
         p.get("gameextrainfo", ""), p.get("gameid", ""),
         p.get("lastlogoff", 0), p.get("loccountrycode", "")],
    )
    print(f"Saved player status for {TODAY}: {p.get('personaname', '?')}")


def main():
    print(f"=== Steam Sync {TODAY} ===\n")
    sync_player_status()
    sync_owned_games()
    sync_recent_sessions()
    print(f"\n=== Sync complete ===")


if __name__ == "__main__":
    main()
