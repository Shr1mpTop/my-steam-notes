"""
Enrichment sync: fetch store details, achievements, steam level.
Run daily alongside sync_turso.py.

Batched execution (DEV-005): every appid is a batch item tracked in
data/sync_batch/sync_enrichment.json with a pending/success/empty/retry/failed
status, so a single game failing no longer exits silently. HTTP responses are
validated (status code + JSON schema); store "success=false" counts as empty,
schema violations and DB write failures count as failed (never swallowed).
Reruns only process pending/retry/failed items plus results older than
--stale-hours; results already in the DB are skipped (db-hit) and successes
are never refetched, keeping reruns idempotent. Exits non-zero while any item
stays retry/failed/pending so the workflow turns red.
"""
import argparse
import json
import os
import sys
import time
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

BATCH_SCOPE = "sync_enrichment"
STORE_RATE_LIMIT_SECONDS = 1.2  # Steam Store rate limit
ACHIEVEMENT_RATE_LIMIT_SECONDS = 1

STEAM_LEVEL_SCHEMA = {"required": ["response"]}


def store_schema(appid):
    """Store appdetails schema: success=false is a legal empty result; when
    success is truthy the data object must exist."""
    return {
        "truthy_empty": [f"{appid}.success"],
        "required": [f"{appid}.data"],
    }


PLAYER_ACHIEVEMENTS_SCHEMA = {
    "required": ["playerstats"],
    "list": "playerstats.achievements",
    "list_optional": True,  # games without achievements omit the list
}
GLOBAL_ACHIEVEMENTS_SCHEMA = {
    "required": ["achievementpercentages"],
    "list": "achievementpercentages.achievements",
    "list_optional": False,
}


def get_json(url, params=None, timeout=15):
    """Legacy helper kept for compatibility: validated fetch returning the
    parsed JSON body (raises TransientFetchError/PermanentFetchError on bad
    responses instead of returning garbage)."""
    data, _kind = fetch_json(requests.get, url, params=params, timeout=timeout)
    return data


def list_store_appids():
    rows = execute(
        "SELECT appid FROM owned_games WHERE playtime_forever > 0 ORDER BY playtime_forever DESC LIMIT 50"
    )
    return [r["appid"] for r in rows]


def list_achievement_games():
    return execute(
        "SELECT appid, name FROM owned_games WHERE playtime_forever > 0 ORDER BY playtime_forever DESC LIMIT 20"
    )


def sync_steam_level(batch=None, item_id="steam_level"):
    """Fetch player Steam level (batch item)."""
    def _process():
        data, _kind = fetch_json(
            requests.get,
            "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/",
            {"key": KEY, "steamid": SID, "format": "json"},
            timeout=15,
            schema=STEAM_LEVEL_SCHEMA,
        )
        level = data.get("response", {}).get("player_level", 0)
        execute(
            "INSERT OR REPLACE INTO steam_level (date, level) VALUES (?, ?)",
            [TODAY, level],
        )
        print(f"Steam level: {level}")
        return STATUS_SUCCESS, f"level={level}"

    return dispatch(batch, item_id, _process)


def sync_store_item(appid, batch):
    """Fetch store details for one appid (batch item store_details:<appid>)."""
    item_id = f"store_details:{appid}"

    def _process(appid=appid):
        data, kind = fetch_json(
            requests.get,
            f"https://store.steampowered.com/api/appdetails",
            {"appids": appid, "l": "english"},
            timeout=15,
            schema=store_schema(appid),
        )
        if kind == STATUS_EMPTY:
            return STATUS_EMPTY, f"store reports no data for appid {appid}"

        d = data[str(appid)]["data"]
        now = datetime.now(TZ).isoformat()
        genres = json.dumps([g["description"] for g in d.get("genres", [])])
        categories = json.dumps([c["description"] for c in d.get("categories", [])])
        price = json.dumps(d.get("price_overview", {}))

        execute(
            """INSERT OR IGNORE INTO game_details (appid, name, header_image, price_overview, genres, categories, type, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [appid, d.get("name", ""), d.get("header_image", ""), price, genres, categories, d.get("type", ""), now],
        )
        return STATUS_SUCCESS, d.get("name", "")

    return dispatch(batch, item_id, _process)


def sync_store_details(batch=None, appids=None):
    """Fetch store details for the top games by playtime, one item per appid."""
    if batch is None:
        batch = SyncBatch.ephemeral(BATCH_SCOPE)
    if appids is None:
        appids = list_store_appids()
    count = 0

    for appid in appids:
        item_id = f"store_details:{appid}"
        if not batch.should_run(item_id):
            batch.skip(item_id)
            continue

        existing = execute("SELECT appid FROM game_details WHERE appid = ?", [appid])
        if existing:
            batch.mark_success(item_id, note="already in game_details (db-hit)")
            print(f"  {appid}: details already stored, skipped")
            continue

        status = sync_store_item(appid, batch)
        if status == STATUS_SUCCESS:
            count += 1
        time.sleep(STORE_RATE_LIMIT_SECONDS)  # Steam Store rate limit

    print(f"Fetched store details for {count} new games")
    return count


def sync_achievement_item(appid, name, batch):
    """Fetch achievements for one game (batch item achievements:<appid>)."""
    item_id = f"achievements:{appid}"

    def _process(appid=appid, name=name):
        # Fetch player achievements
        p_data, kind = fetch_json(
            requests.get,
            "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
            {"key": KEY, "steamid": SID, "appid": appid, "format": "json"},
            timeout=15,
            schema=PLAYER_ACHIEVEMENTS_SCHEMA,
        )
        if kind == STATUS_EMPTY:
            print(f"  {name}: no achievements")
            return STATUS_EMPTY, f"no achievements for {name}"

        achievements = p_data["playerstats"]["achievements"]

        # Fetch global percentages; unavailable globals degrade to 0 but are
        # recorded on the item so the gap stays locatable.
        note = None
        global_map = {}
        try:
            g_data, _gkind = fetch_json(
                requests.get,
                "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
                {"gameid": appid, "format": "json"},
                timeout=15,
                schema=GLOBAL_ACHIEVEMENTS_SCHEMA,
            )
            for a in g_data["achievementpercentages"]["achievements"]:
                global_map[a["name"]] = float(a["percent"])
        except Exception as e:
            note = f"global percentages unavailable ({type(e).__name__}: {e}); stored 0 defaults"

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
        return STATUS_SUCCESS, note

    return dispatch(batch, item_id, _process)


def sync_achievements(batch=None, games=None):
    """Fetch achievements for the top games by playtime, one item per appid."""
    if batch is None:
        batch = SyncBatch.ephemeral(BATCH_SCOPE)
    if games is None:
        games = list_achievement_games()

    for game in games:
        appid = game["appid"]
        name = game["name"]
        item_id = f"achievements:{appid}"
        if not batch.should_run(item_id):
            batch.skip(item_id)
            continue

        # Skip if already fetched today (kept for idempotency on top of the batch)
        existing = execute(
            "SELECT COUNT(*) as cnt FROM game_achievements WHERE appid = ?",
            [appid],
        )
        if existing and existing[0]["cnt"] > 0:
            batch.mark_success(item_id, note="already in game_achievements (db-hit)")
            print(f"  {name}: achievements already stored, skipped")
            continue

        sync_achievement_item(appid, name, batch)
        time.sleep(ACHIEVEMENT_RATE_LIMIT_SECONDS)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Enrichment sync (batched)")
    add_cli_args(parser)
    args = parser.parse_args(argv)

    print(f"=== Enrichment Sync {TODAY} ===\n")
    store_appids = list_store_appids()
    achievement_games = list_achievement_games()
    item_ids = (
        ["steam_level"]
        + [f"store_details:{appid}" for appid in store_appids]
        + [f"achievements:{g['appid']}" for g in achievement_games]
    )

    batch = SyncBatch.load_or_create(
        BATCH_SCOPE, item_ids, state_dir=args.state_dir,
        stale_hours=args.stale_hours, max_attempts=args.max_attempts,
        force_all=args.force_all,
    )
    print(f"[batch {batch.batch_id}] {len(item_ids)} items, checkpoint: {batch.path}\n")
    batch.begin_run()

    sync_steam_level(batch)
    print()
    sync_store_details(batch, appids=store_appids)
    print()
    sync_achievements(batch, games=achievement_games)

    print(f"\n=== Enrichment complete ===")
    batch.finish()
    print_failures(batch)
    return batch.exit_code()


if __name__ == "__main__":
    sys.exit(main())
