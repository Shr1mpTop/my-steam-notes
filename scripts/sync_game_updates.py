"""
Sync Steam update posts for games in the library.

Steam's public ISteamNews/GetNewsForApp endpoint returns app news, not a
dedicated "updates only" stream, so this script keeps only posts that look like
patch notes, hotfixes, changelogs, builds, or major/content updates.
"""
import hashlib
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv

sys.path.insert(0, ".")
from scripts.turso_db import execute, execute_many

load_dotenv()

TZ = timezone(timedelta(hours=8))
NEWS_URL = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/"
LOOKBACK_DAYS = int(os.getenv("STEAM_UPDATE_LOOKBACK_DAYS", "2"))
NEWS_COUNT = int(os.getenv("STEAM_UPDATE_NEWS_COUNT", "20"))
REQUEST_SLEEP = float(os.getenv("STEAM_UPDATE_REQUEST_SLEEP", "0.25"))

UPDATE_TERMS = (
    "major update",
    "content update",
    "game update",
    "update",
    "patch notes",
    "patch note",
    "patch",
    "hotfix",
    "changelog",
    "change log",
    "release notes",
    "bug fix",
    "bugfix",
    "balance update",
    "build",
)

VERSION_RE = re.compile(r"\b(v|version)\s?\d+(\.\d+){0,3}\b", re.IGNORECASE)

EXCLUDE_TERMS = (
    "sale",
    "discount",
    "free weekend",
    "livestream",
    "live stream",
    "tournament",
    "contest",
    "soundtrack",
    "trailer",
    "developer diary",
    "dev diary",
    "community spotlight",
)


def ensure_schema():
    execute(
        """CREATE TABLE IF NOT EXISTS game_news_updates (
            gid TEXT PRIMARY KEY,
            appid INTEGER NOT NULL,
            game_name TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            date INTEGER NOT NULL,
            feedname TEXT,
            feedlabel TEXT,
            update_type TEXT,
            contents TEXT,
            captured_at TEXT
        )"""
    )


def classify_update(item):
    title = (item.get("title") or "").strip()
    contents = (item.get("contents") or "").strip()
    feedname = (item.get("feedname") or "").strip()
    feedlabel = (item.get("feedlabel") or "").strip()
    haystack = " ".join([title, feedname, feedlabel, contents[:500]]).lower()

    if any(term in haystack for term in EXCLUDE_TERMS):
        return None

    if "major update" in haystack:
        return "Major Update"
    if "content update" in haystack or "game update" in haystack:
        return "Content Update"
    if "hotfix" in haystack:
        return "Hotfix"
    if "patch" in haystack or "changelog" in haystack or "release notes" in haystack:
        return "Patch Notes"
    if "update" in haystack or "build" in haystack or VERSION_RE.search(haystack):
        return "Update"
    return None


def stable_gid(appid, item):
    raw_gid = str(item.get("gid") or "").strip()
    if raw_gid:
        return raw_gid
    seed = f"{appid}:{item.get('date', '')}:{item.get('title', '')}"
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()


def fetch_news(appid):
    resp = requests.get(
        NEWS_URL,
        params={
            "appid": appid,
            "count": NEWS_COUNT,
            "maxlength": 800,
            "format": "json",
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("appnews", {}).get("newsitems", [])


def library_games():
    return execute("SELECT appid, name FROM owned_games ORDER BY playtime_forever DESC, name ASC")


def sync_game_updates():
    ensure_schema()
    cutoff = int((datetime.now(TZ) - timedelta(days=LOOKBACK_DAYS)).timestamp())
    captured_at = datetime.now(TZ).isoformat()
    rows = []

    games = library_games()
    for index, game in enumerate(games, start=1):
        appid = game["appid"]
        name = game["name"]
        try:
            items = fetch_news(appid)
        except Exception as exc:
            print(f"{index}/{len(games)} {name}: news fetch failed: {exc}")
            time.sleep(REQUEST_SLEEP)
            continue

        kept = 0
        for item in items:
            date = int(item.get("date") or 0)
            if date < cutoff:
                continue

            update_type = classify_update(item)
            if not update_type:
                continue

            rows.append([
                stable_gid(appid, item),
                appid,
                name,
                item.get("title", ""),
                item.get("url", ""),
                date,
                item.get("feedname", ""),
                item.get("feedlabel", ""),
                update_type,
                item.get("contents", ""),
                captured_at,
            ])
            kept += 1

        print(f"{index}/{len(games)} {name}: {kept} update posts")
        time.sleep(REQUEST_SLEEP)

    if rows:
        execute_many(
            """INSERT OR REPLACE INTO game_news_updates
               (gid, appid, game_name, title, url, date, feedname, feedlabel, update_type, contents, captured_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )

    print(f"Recorded {len(rows)} update posts")


if __name__ == "__main__":
    sync_game_updates()
