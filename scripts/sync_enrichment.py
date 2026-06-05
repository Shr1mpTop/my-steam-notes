"""
Enrichment sync: fetch store details, achievements, steam level.
Run daily alongside sync_turso.py.
"""
import os
import sys
import time
import json
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


def get_json(url, params=None, timeout=15):
    try:
        resp = requests.get(url, params=params or {}, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        print(f"Steam enrichment fetch skipped: HTTP {status} for {url}")
    except (requests.RequestException, ValueError) as exc:
        print(f"Steam enrichment fetch skipped: {exc} for {url}")
    return {}


def sync_steam_level():
    """Fetch player Steam level."""
    data = get_json(
        "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/",
        {"key": KEY, "steamid": SID, "format": "json"},
    )
    response = data.get("response", {})
    if "player_level" not in response:
        print("Steam level sync skipped: no level returned")
        return

    level = response.get("player_level", 0)
    execute(
        "INSERT OR REPLACE INTO steam_level (date, level) VALUES (?, ?)",
        [TODAY, level],
    )
    print(f"Steam level: {level}")


def sync_store_details():
    """Fetch store details for top 50 games by playtime."""
    rows = execute(
        "SELECT appid FROM owned_games WHERE playtime_forever > 0 ORDER BY playtime_forever DESC LIMIT 50"
    )
    appids = [r["appid"] for r in rows]
    now = datetime.now(TZ).isoformat()
    count = 0

    for appid in appids:
        existing = execute("SELECT appid FROM game_details WHERE appid = ?", [appid])
        if existing:
            continue

        try:
            data = get_json(
                f"https://store.steampowered.com/api/appdetails",
                {"appids": appid, "l": "english"},
            )
            app_data = data.get(str(appid), {})
            if not app_data.get("success"):
                continue

            d = app_data["data"]
            genres = json.dumps([g["description"] for g in d.get("genres", [])])
            categories = json.dumps([c["description"] for c in d.get("categories", [])])
            price = json.dumps(d.get("price_overview", {}))

            execute(
                """INSERT OR IGNORE INTO game_details (appid, name, header_image, price_overview, genres, categories, type, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                [appid, d.get("name", ""), d.get("header_image", ""), price, genres, categories, d.get("type", ""), now],
            )
            count += 1
            time.sleep(1.2)  # Steam Store rate limit
        except Exception as e:
            print(f"  Error fetching {appid}: {e}")
            continue

    print(f"Fetched store details for {count} new games")


def sync_achievements():
    """Fetch achievements for top 20 games by playtime."""
    rows = execute(
        "SELECT appid, name FROM owned_games WHERE playtime_forever > 0 ORDER BY playtime_forever DESC LIMIT 20"
    )

    for game in rows:
        appid = game["appid"]
        name = game["name"]

        # Skip if already fetched today
        existing = execute(
            "SELECT COUNT(*) as cnt FROM game_achievements WHERE appid = ?",
            [appid],
        )
        if existing and existing[0]["cnt"] > 0:
            continue

        # Fetch player achievements
        try:
            p_data = get_json(
                "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
                {"key": KEY, "steamid": SID, "appid": appid, "format": "json"},
            )
        except Exception:
            continue

        achievements = p_data.get("playerstats", {}).get("achievements", [])
        if not achievements:
            print(f"  {name}: no achievements")
            continue

        # Fetch global percentages
        try:
            g_data = get_json(
                "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
                {"gameid": appid, "format": "json"},
            )
            global_map = {}
            for a in g_data.get("achievementpercentages", {}).get("achievements", []):
                global_map[a["name"]] = float(a["percent"])
        except Exception:
            global_map = {}

        # Insert achievements
        args = []
        for a in achievements:
            apiname = a.get("apiname", "")
            achieved = a.get("achieved", 0)
            unlocktime = a.get("unlocktime", 0)
            gp = global_map.get(apiname, 0)
            args.append([appid, apiname, achieved, unlocktime, str(gp)])

        if args:
            execute_many(
                """INSERT OR REPLACE INTO game_achievements (appid, apiname, achieved, unlocktime, global_percent)
                   VALUES (?, ?, ?, ?, ?)""",
                args,
            )

        achieved_count = sum(1 for a in achievements if a.get("achieved") == 1)
        print(f"  {name}: {achieved_count}/{len(achievements)} achievements")
        time.sleep(1)


def main():
    print(f"=== Enrichment Sync {TODAY} ===\n")
    sync_steam_level()
    print()
    sync_store_details()
    print()
    sync_achievements()
    print(f"\n=== Enrichment complete ===")


if __name__ == "__main__":
    main()
