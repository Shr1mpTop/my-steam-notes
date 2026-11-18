#!/usr/bin/env python3
"""Matrix data API for steam.zhili-he.top — read-only SQLite over HTTP.

Pure stdlib (http.server). Serves the local steam.db through a wide read-only
API surface so the terminal UI can bombard itself with data:

  GET /api/status            collector status + db size + table counts
  GET /api/me                my live presence + totals
  GET /api/friends           friends_current joined with sweeps (live state)
  GET /api/friend/<steamid>  one friend: meta + top games
  GET /api/leaderboards      total/2-week ranking (me + public friends)
  GET /api/shared?limit=N    shared games (my hours vs friends' hours)
  GET /api/games?limit=N     my owned games by hours
  GET /api/polls?limit=N     recent self status polls
  GET /api/friend-polls?limit=N  recent friend poll rows
  GET /api/sweeps            friend library sweep state
  GET /api/news?limit=N      recent game update posts
  GET /api/raw?table=NAME&limit=N   whitelisted raw table dump
  GET /api/stats             row counts for every table

All responses are JSON; no writes, WAL read-only connections, no auth (LAN /
tunnel only, same trust model as the other phone APIs).
"""
import json
import os
import sqlite3
import time
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

TZ = timezone(timedelta(hours=8))
DB = os.getenv("STEAM_DB_PATH", "/root/steam-notes/data/steam.db")
PORT = int(os.getenv("STEAM_API_PORT", "8083"))
STATUS_FILE = os.getenv("COLLECTOR_STATUS_FILE", "/root/steam-notes/data/collector-status.json")

RAW_TABLES = {
    "status_polls", "steam_friends", "friend_status_polls", "friend_games",
    "friend_sweeps", "friends_current", "owned_games", "daily_snapshots",
    "recent_sessions", "player_daily", "steam_level", "game_details",
    "game_achievements", "game_news_updates",
}


def db():
    conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def q(sql, args=()):
    conn = db()
    try:
        return [dict(r) for r in conn.execute(sql, args).fetchall()]
    finally:
        conn.close()


# TTL cache for whole-table COUNT scans (friend_status_polls alone is ~1.7M
# rows on disk; counting it on every 15s poll would burn phone CPU)
_COUNT_CACHE = {"ts": 0.0, "counts": None}
COUNT_TTL = 30.0

# generic TTL cache for heavy aggregate queries
_AGG_CACHE = {}


def cached(key, ttl, fn):
    now = time.time()
    hit = _AGG_CACHE.get(key)
    if hit is not None and now - hit[0] < ttl:
        payload = dict(hit[1])
        payload["cache_age"] = round(now - hit[0], 1)
        return payload
    payload = fn()
    _AGG_CACHE[key] = (now, payload)
    return payload


def table_counts():
    now = time.time()
    if _COUNT_CACHE["counts"] is not None and now - _COUNT_CACHE["ts"] < COUNT_TTL:
        return _COUNT_CACHE["counts"]
    counts = {}
    conn = db()
    try:
        for t in sorted(RAW_TABLES):
            try:
                counts[t] = conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            except sqlite3.OperationalError:
                counts[t] = None
    finally:
        conn.close()
    _COUNT_CACHE["ts"] = now
    _COUNT_CACHE["counts"] = counts
    return counts


def now_iso():
    return datetime.now(TZ).isoformat()


def status():
    payload = {"updated_at": now_iso(), "db": DB}
    try:
        with open(STATUS_FILE, encoding="utf-8") as f:
            payload["collector"] = json.load(f)
    except (OSError, ValueError):
        payload["collector"] = None
    try:
        payload["db_bytes"] = os.path.getsize(DB)
        for suffix in ("-wal", "-shm"):
            payload["db_bytes"] += os.path.getsize(DB + suffix) if os.path.exists(DB + suffix) else 0
    except OSError:
        payload["db_bytes"] = 0
    payload["counts"] = table_counts()
    return payload


def me():
    presence = q("SELECT timestamp, personastate, gameextrainfo, gameid FROM status_polls ORDER BY timestamp DESC LIMIT 1")
    totals = q("SELECT COUNT(*) AS games, COALESCE(SUM(playtime_forever),0) AS minutes FROM owned_games")[0]
    two_week = q("SELECT COALESCE(SUM(playtime_2weeks),0) AS minutes FROM recent_sessions WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions)")[0]
    return {
        "updated_at": now_iso(),
        "latest_presence": presence[0] if presence else None,
        "library_games": totals["games"],
        "total_hours": round(totals["minutes"] / 60.0, 1),
        "two_week_hours": round(two_week["minutes"] / 60.0, 1),
    }


def friends():
    rows = q("""
        SELECT c.steamid, c.personaname, c.personastate, c.gameextrainfo, c.gameid,
               c.lastlogoff, c.avatarfull, c.updated_at,
               s.status AS sweep_status, s.game_count, s.total_minutes, s.last_sweep
        FROM friends_current c
        LEFT JOIN friend_sweeps s ON s.steamid = c.steamid
        ORDER BY (c.gameid IS NOT NULL AND c.gameid != '') DESC, s.total_minutes DESC
    """)
    for r in rows:
        r["total_hours"] = round((r["total_minutes"] or 0) / 60.0, 1)
    return {"updated_at": now_iso(), "count": len(rows), "friends": rows}


def friend_detail(steamid):
    meta = q("SELECT * FROM friends_current WHERE steamid = ?", (steamid,))
    sweep = q("SELECT * FROM friend_sweeps WHERE steamid = ?", (steamid,))
    level = q("SELECT player_level, player_xp, badges_count FROM friend_levels WHERE steamid = ?", (steamid,))
    games = q("""
        SELECT fg.appid, COALESCE(og.name, 'App ' || fg.appid) AS name,
               fg.playtime_forever, fg.playtime_2weeks, fg.rtime_last_played,
               og.playtime_forever AS my_minutes
        FROM friend_games fg
        LEFT JOIN owned_games og ON og.appid = fg.appid
        WHERE fg.steamid = ?
        ORDER BY fg.playtime_forever DESC LIMIT 100
    """, (steamid,))
    for g in games:
        g["hours"] = round((g["playtime_forever"] or 0) / 60.0, 1)
        g["my_hours"] = round((g["my_minutes"] or 0) / 60.0, 1)
        g["shared"] = g["my_minutes"] is not None
    shared_count = sum(1 for g in games if g["shared"])
    return {"updated_at": now_iso(), "steamid": steamid,
            "live": meta[0] if meta else None,
            "sweep": sweep[0] if sweep else None,
            "level": level[0] if level else None,
            "shared_count": shared_count,
            "games": games}


def leaderboards():
    my = q("SELECT COALESCE(SUM(playtime_forever),0) AS minutes FROM owned_games")[0]["minutes"]
    my2 = q("SELECT COALESCE(SUM(playtime_2weeks),0) AS minutes FROM recent_sessions WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions)")[0]["minutes"]
    rows = q("""
        SELECT s.steamid, COALESCE(c.personaname, fr.personaname, s.steamid) AS name,
               COALESCE(c.avatarfull, fr.avatarfull, '') AS avatar,
               s.total_minutes, s.total_minutes * 1.0 / 60 AS total_hours,
               (SELECT COALESCE(SUM(playtime_2weeks),0) FROM friend_games fg WHERE fg.steamid = s.steamid) / 60.0 AS two_week_hours
        FROM friend_sweeps s
        LEFT JOIN friends_current c ON c.steamid = s.steamid
        LEFT JOIN steam_friends fr ON fr.steamid = s.steamid
        WHERE s.status = 'ok' AND s.total_minutes > 0
        ORDER BY s.total_minutes DESC
    """)
    board = [{"name": r["name"], "avatar": r["avatar"],
              "hours": round(r["total_hours"] or 0, 1),
              "two_week_hours": round(r["two_week_hours"] or 0, 1),
              "is_self": False} for r in rows]
    board.append({"name": "ME", "avatar": "", "hours": round(my / 60.0, 1),
                  "two_week_hours": round(my2 / 60.0, 1), "is_self": True})
    board.sort(key=lambda x: -x["hours"])
    for i, r in enumerate(board):
        r["rank"] = i + 1
    return {"updated_at": now_iso(), "count": len(board), "leaderboard_total": board}


def shared(limit):
    rows = q("""
        SELECT fg.appid,
               COALESCE(og.name, 'App ' || fg.appid) AS name,
               og.playtime_forever AS my_minutes,
               COUNT(*) AS friend_count,
               SUM(fg.playtime_forever) AS friend_minutes
        FROM friend_games fg
        JOIN owned_games og ON og.appid = fg.appid
        GROUP BY fg.appid
        ORDER BY friend_count DESC, friend_minutes DESC
        LIMIT ?
    """, (limit,))
    for r in rows:
        r["my_hours"] = round((r["my_minutes"] or 0) / 60.0, 1)
        r["friend_hours_total"] = round((r["friend_minutes"] or 0) / 60.0, 1)
        r["friends"] = q("""
            SELECT COALESCE(c.personaname, fg.steamid) AS name, fg.playtime_forever / 60.0 AS hours
            FROM friend_games fg LEFT JOIN friends_current c ON c.steamid = fg.steamid
            WHERE fg.appid = ? ORDER BY fg.playtime_forever DESC LIMIT 8
        """, (r["appid"],))
        for f in r["friends"]:
            f["hours"] = round(f["hours"] or 0, 1)
    return {"updated_at": now_iso(), "count": len(rows), "shared_games": rows}


def games(limit):
    rows = q("""
        SELECT appid, name, playtime_forever, rtime_last_played, img_icon_url
        FROM owned_games ORDER BY playtime_forever DESC LIMIT ?
    """, (limit,))
    for r in rows:
        r["hours"] = round((r["playtime_forever"] or 0) / 60.0, 1)
    return {"updated_at": now_iso(), "count": len(rows), "games": rows}


def recent_two_week():
    rows = q("""
        SELECT appid, name, playtime_2weeks, playtime_forever
        FROM recent_sessions
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions)
          AND playtime_2weeks > 0
        ORDER BY playtime_2weeks DESC LIMIT 15
    """)
    for r in rows:
        r["hours_2w"] = round((r["playtime_2weeks"] or 0) / 60.0, 1)
        r["hours_total"] = round((r["playtime_forever"] or 0) / 60.0, 1)
    return {"updated_at": now_iso(), "count": len(rows), "recent": rows}


def polls(limit):
    return {"updated_at": now_iso(),
            "polls": q("SELECT * FROM status_polls ORDER BY timestamp DESC LIMIT ?", (limit,))}


def friend_polls(limit):
    return {"updated_at": now_iso(),
            "friend_polls": q("SELECT steamid, personaname, personastate, gameextrainfo, gameid, timestamp FROM friend_status_polls ORDER BY timestamp DESC LIMIT ?", (limit,))}


def sweeps():
    rows = q("""
        SELECT s.steamid, COALESCE(c.personaname, fr.personaname, s.steamid) AS name,
               s.status, s.game_count, s.total_minutes, s.last_sweep
        FROM friend_sweeps s
        LEFT JOIN friends_current c ON c.steamid = s.steamid
        LEFT JOIN steam_friends fr ON fr.steamid = s.steamid
        ORDER BY s.total_minutes DESC
    """)
    for r in rows:
        r["total_hours"] = round((r["total_minutes"] or 0) / 60.0, 1)
    return {"updated_at": now_iso(), "count": len(rows), "sweeps": rows}


def news(limit):
    try:
        rows = q("SELECT appid, game_name, title, url, date, update_type FROM game_news_updates ORDER BY date DESC LIMIT ?", (limit,))
    except sqlite3.OperationalError:
        rows = []
    return {"updated_at": now_iso(), "count": len(rows), "news": rows}


def achieve_compare():
    """Achievement completion ladder for the most-played shared game (me + friends)."""
    def build():
        # degenerate schemas (CS2 ships a single placeholder achievement) are
        # useless for comparison — require a real achievement set, else fall
        # back to the top shared game by minutes
        top = q("""
            SELECT fg.appid, COALESCE(og.name, 'App ' || fg.appid) AS name
            FROM friend_games fg
            JOIN owned_games og ON og.appid = fg.appid
            JOIN (SELECT appid, COUNT(*) AS n FROM game_achievements GROUP BY appid) ga
              ON ga.appid = fg.appid
            WHERE fg.appid != 730 AND ga.n >= 5
            GROUP BY fg.appid
            ORDER BY SUM(fg.playtime_forever) DESC
        """)
        if not top:
            top = q("""
                SELECT fg.appid, COALESCE(og.name, 'App ' || fg.appid) AS name
                FROM friend_games fg
                WHERE fg.appid != 730
                GROUP BY fg.appid
                ORDER BY SUM(fg.playtime_forever) DESC
            """)
        if not top:
            return {"updated_at": now_iso(), "game": None, "ladder": []}
        appid, name = top[0]["appid"], top[0]["name"]
        # primary: read from game_achievements (locally maintained)
        my_achieved = q(
            "SELECT COUNT(*) AS c FROM game_achievements WHERE appid = ? AND achieved = 1", (appid,)
        )[0]["c"]
        my_ach_total = q(
            "SELECT COUNT(*) AS c FROM game_achievements WHERE appid = ?", (appid,)
        )[0]["c"]
        # secondary: refresh from Steam API if local data seems thin (< total from friends)
        if my_ach_total < 5:
            try:
                import requests as _req
                key = os.getenv("STEAM_API_KEY", "")
                sid = os.getenv("STEAM_ID", "")
                r = _req.get(
                    f"https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/",
                    params={"key": key, "steamid": sid, "appid": appid}, timeout=15,
                )
                if r.ok:
                    achs = (r.json().get("playerstats", {}) or {}).get("achievements", [])
                    if achs:
                        my_ach_total = len(achs)
                        my_achieved = sum(1 for a in achs if a.get("achieved") == 1)
            except Exception:
                pass
        rows = q("""
            SELECT fa.steamid, COALESCE(c.personaname, fa.steamid) AS name,
                   COALESCE(c.avatarfull, '') AS avatar,
                   fa.achieved, fa.total
            FROM friend_achievements fa
            LEFT JOIN friends_current c ON c.steamid = fa.steamid
            WHERE fa.appid = ?
            ORDER BY fa.achieved DESC
        """, (appid,))
        ladder = [{"name": "ME", "avatar": "", "achieved": my_achieved,
                   "total": my_ach_total, "is_self": True}]
        for r in rows:
            ladder.append({"name": r["name"], "avatar": r["avatar"],
                           "achieved": r["achieved"], "total": r["total"], "is_self": False})
        return {"updated_at": now_iso(), "appid": appid, "game": name, "ladder": ladder}
    return cached("achieve-compare", 300, build)


def stats():
    return {"updated_at": now_iso(), "tables": table_counts()}


# ---------------- matrix expansions (heavy aggregates, TTL-cached) ----------------

def hot_week(limit):
    """Games friends played most in the last 2 weeks (by friend 2-week minutes)."""
    def build():
        rows = q("""
            SELECT fg.appid,
                   COALESCE(og.name, 'App ' || fg.appid) AS name,
                   SUM(fg.playtime_2weeks) AS week_minutes,
                   COUNT(DISTINCT fg.steamid) AS players
            FROM friend_games fg
            LEFT JOIN owned_games og ON og.appid = fg.appid
            WHERE fg.playtime_2weeks > 0
            GROUP BY fg.appid
            ORDER BY week_minutes DESC
            LIMIT ?
        """, (limit,))
        mine = {r["appid"]: (r["playtime_forever"] or 0) for r in q("SELECT appid, playtime_forever FROM owned_games")}
        for r in rows:
            r["week_hours"] = round((r["week_minutes"] or 0) / 60.0, 1)
            r["my_hours"] = round(mine.get(r["appid"], 0) / 60.0, 1)
        return {"updated_at": now_iso(), "count": len(rows), "hot_games": rows}
    return cached("hot-week", 300, build)


def hourly():
    """Friend poll volume by local hour-of-day (0-23) — when do people play."""
    def build():
        rows = q("""
            SELECT strftime('%H', timestamp, '+8 hours') AS h, COUNT(*) AS minutes
            FROM friend_status_polls
            GROUP BY h ORDER BY h
        """)
        buckets = {f"{i:02d}": 0 for i in range(24)}
        for r in rows:
            buckets[r["h"]] = r["minutes"]
        return {"updated_at": now_iso(), "hourly_minutes": buckets}
    return cached("hourly", 600, build)


def night_owls(limit):
    """Friends ranked by play minutes between 00:00-06:00 local."""
    def build():
        rows = q("""
            SELECT COALESCE(c.personaname, fr.personaname, fp.steamid) AS name,
                   COUNT(*) / 60.0 AS night_hours
            FROM friend_status_polls fp
            LEFT JOIN friends_current c ON c.steamid = fp.steamid
            LEFT JOIN steam_friends fr ON fr.steamid = fp.steamid
            WHERE CAST(strftime('%H', fp.timestamp, '+8 hours') AS INTEGER) < 6
            GROUP BY fp.steamid
            ORDER BY night_hours DESC
            LIMIT ?
        """, (limit,))
        for r in rows:
            r["night_hours"] = round(r["night_hours"] or 0, 1)
        return {"updated_at": now_iso(), "count": len(rows), "night_owls": rows}
    return cached("night-owls", 600, build)


def presence_daily(days):
    """Per-day online minutes from the compact aggregation tables (forever history)."""
    def build():
        since = (datetime.now(TZ) - timedelta(days=days)).strftime("%Y-%m-%d")
        daily = q("""
            SELECT d.date AS d, ROUND(SUM(d.minutes)/60.0, 1) AS online_hours,
                   COUNT(DISTINCT d.steamid) AS friends_active
            FROM friend_presence_daily d
            WHERE d.date >= ?
            GROUP BY d.date ORDER BY d.date
        """, (since,))
        me_daily = q("""
            SELECT date AS d, ROUND(minutes/60.0, 1) AS my_online_hours,
                   ROUND(playing_minutes/60.0, 1) AS my_playing_hours
            FROM my_presence_daily WHERE date >= ? ORDER BY date
        """, (since,))
        return {"updated_at": now_iso(), "days": days,
                "daily": daily, "me_daily": me_daily}
    return cached("presence-daily", 300, build)


def presence_today():
    """Today's online-minutes leaderboard (friends + me)."""
    def build():
        today = datetime.now(TZ).strftime("%Y-%m-%d")
        rows = q("""
            SELECT COALESCE(c.personaname, p.steamid) AS name,
                   p.minutes, c.gameextrainfo AS game, c.avatarfull AS avatar
            FROM friend_presence_daily p
            LEFT JOIN friends_current c ON c.steamid = p.steamid
            WHERE p.date = ?
            ORDER BY p.minutes DESC
        """, (today,))
        for r in rows:
            r["hours"] = round(r["minutes"] / 60.0, 2)
        me = q("SELECT minutes FROM my_presence_daily WHERE date = ?", (today,))
        return {"updated_at": now_iso(), "date": today,
                "count": len(rows), "today": rows, "me_minutes": me[0]["minutes"] if me else 0}
    return cached("presence-today", 60, build)


def records():
    """Superlatives across the whole dataset."""
    def build():
        most_total = q("""
            SELECT COALESCE(c.personaname, fr.personaname, s.steamid) AS name,
                   s.total_minutes / 60.0 AS hours
            FROM friend_sweeps s
            LEFT JOIN friends_current c ON c.steamid = s.steamid
            LEFT JOIN steam_friends fr ON fr.steamid = s.steamid
            WHERE s.status = 'ok' ORDER BY s.total_minutes DESC LIMIT 1
        """)
        biggest_lib = q("""
            SELECT COALESCE(c.personaname, fr.personaname, s.steamid) AS name, s.game_count
            FROM friend_sweeps s
            LEFT JOIN friends_current c ON c.steamid = s.steamid
            LEFT JOIN steam_friends fr ON fr.steamid = s.steamid
            WHERE s.status = 'ok' ORDER BY s.game_count DESC LIMIT 1
        """)
        oldest_friendship = q("""
            SELECT COALESCE(fr.personaname, fr.steamid) AS name, fr.friend_since,
                   CAST((strftime('%s','now') - fr.friend_since) / 86400 AS INTEGER) AS days
            FROM steam_friends fr WHERE fr.friend_since > 0 ORDER BY fr.friend_since ASC LIMIT 1
        """)
        owl = night_owls(1).get("night_owls", [{}])[0]
        hot = hot_week(1).get("hot_games", [{}])[0]
        highest_level = q("""
            SELECT COALESCE(c.personaname, fl.steamid) AS name, fl.player_level
            FROM friend_levels fl LEFT JOIN friends_current c ON c.steamid = fl.steamid
            WHERE fl.status = 'ok' ORDER BY fl.player_level DESC LIMIT 1
        """)
        return {"updated_at": now_iso(),
                "most_hours": most_total[0] if most_total else None,
                "biggest_library": biggest_lib[0] if biggest_lib else None,
                "oldest_friendship": oldest_friendship[0] if oldest_friendship else None,
                "top_night_owl": owl or None,
                "hot_game_this_week": hot or None,
                "highest_level": highest_level[0] if highest_level else None}
    return cached("records", 600, build)


def bans():
    rows = q("""
        SELECT b.steamid, COALESCE(c.personaname, b.steamid) AS name,
               COALESCE(c.avatarfull, '') AS avatar,
               b.community_banned, b.vac_banned, b.num_vac_bans,
               b.days_since_last_ban, b.num_game_bans, b.economy_ban, b.updated_at
        FROM friend_bans b LEFT JOIN friends_current c ON c.steamid = b.steamid
        ORDER BY (b.vac_banned * 100 + b.num_game_bans * 50 + b.community_banned * 10) DESC,
                 b.num_vac_bans DESC, c.personaname
    """)
    flagged = [r for r in rows if r["vac_banned"] or r["num_game_bans"] or r["community_banned"]]
    return {"updated_at": now_iso(), "checked": len(rows), "flagged": len(flagged),
            "flagged_friends": flagged, "bans": rows}


def levels():
    rows = q("""
        SELECT fl.steamid, COALESCE(c.personaname, fl.steamid) AS name,
               COALESCE(c.avatarfull, '') AS avatar,
               fl.player_level, fl.player_xp, fl.xp_to_level_up,
               fl.badges_count, fl.status, fl.updated_at
        FROM friend_levels fl LEFT JOIN friends_current c ON c.steamid = fl.steamid
        WHERE fl.status = 'ok'
        ORDER BY fl.player_level DESC, fl.player_xp DESC
    """)
    my_level = q("SELECT level FROM steam_level ORDER BY date DESC LIMIT 1")
    return {"updated_at": now_iso(), "count": len(rows),
            "my_level": my_level[0]["level"] if my_level else None,
            "levels": rows}


def badges():
    rows = q("""
        SELECT fl.steamid, COALESCE(c.personaname, fl.steamid) AS name,
               fl.player_xp, fl.badges_count, fl.player_level
        FROM friend_levels fl LEFT JOIN friends_current c ON c.steamid = fl.steamid
        WHERE fl.status = 'ok' AND fl.badges_count > 0
        ORDER BY fl.player_xp DESC
    """)
    return {"updated_at": now_iso(), "count": len(rows), "badges": rows}


def concurrent():
    latest = q("""
        SELECT g.appid, COALESCE(og.name, 'App ' || g.appid) AS name,
               g.ts, g.player_count
        FROM game_concurrent g
        JOIN (SELECT appid, MAX(ts) AS mts FROM game_concurrent GROUP BY appid) m
          ON m.appid = g.appid AND m.mts = g.ts
        LEFT JOIN owned_games og ON og.appid = g.appid
        ORDER BY g.player_count DESC
    """)
    return {"updated_at": now_iso(), "count": len(latest), "concurrent": latest}


def countries():
    rows = q("""
        SELECT COALESCE(NULLIF(loccountrycode, ''), '??') AS cc, COUNT(*) AS friends
        FROM friends_current GROUP BY cc ORDER BY friends DESC
    """)
    return {"updated_at": now_iso(), "count": len(rows), "countries": rows}


def raw(table, limit):
    if table not in RAW_TABLES:
        return None
    return {"updated_at": now_iso(), "table": table,
            "rows": q(f'SELECT * FROM "{table}" LIMIT ?', (limit,))}


# ------------- 100-agent expansion: new data dimensions (TTL-cached) -------------

FX_TO_USD = {
    "USD": 1.0, "SGD": 0.74, "EUR": 1.08, "CNY": 0.14, "JPY": 0.0067,
    "GBP": 1.27, "CAD": 0.73, "AUD": 0.66, "BRL": 0.19, "INR": 0.012,
    "KRW": 0.00073, "HKD": 0.128, "TWD": 0.031, "NOK": 0.093, "SEK": 0.095,
    "DKK": 0.145, "PLN": 0.25, "TRY": 0.03, "RUB": 0.011, "MXN": 0.055,
}


def play_daily(days):
    """Daily playtime timeline (daily_snapshots) with calendar gap-fill, streaks, best day."""
    def build():
        end = q("SELECT MAX(date) AS d FROM daily_snapshots")[0]["d"]
        if not end:
            return {"updated_at": now_iso(), "days": days, "daily": [], "summary": {}}
        rows = q("""
            WITH RECURSIVE cal(d) AS (
                SELECT date(?, ?)
                UNION ALL SELECT date(d, '+1 day') FROM cal WHERE d < ?
            )
            SELECT cal.d AS d,
                   COALESCE(ROUND(SUM(ds.daily_playtime)/60.0, 2), 0.0) AS hours,
                   COUNT(DISTINCT CASE WHEN ds.daily_playtime > 0 THEN ds.appid END) AS games,
                   (SELECT name FROM daily_snapshots t WHERE t.date = cal.d AND t.daily_playtime > 0
                    ORDER BY t.daily_playtime DESC LIMIT 1) AS top_game
            FROM cal LEFT JOIN daily_snapshots ds ON ds.date = cal.d
            GROUP BY cal.d ORDER BY cal.d
        """, (end, f"-{max(1, days - 1)} days", end))
        hours_list = [r["hours"] for r in rows]
        best = max(rows, key=lambda r: r["hours"]) if rows else None
        cur = 0
        for h in reversed(hours_list):
            if h > 0:
                cur += 1
            else:
                break
        longest = run = 0
        for h in hours_list:
            run = run + 1 if h > 0 else 0
            longest = max(longest, run)
        n = len(hours_list)
        return {"updated_at": now_iso(), "end": end, "days": days, "daily": rows,
                "summary": {"avg_7d": round(sum(hours_list[-7:]) / max(1, min(7, n)), 2),
                            "avg_30d": round(sum(hours_list[-30:]) / max(1, min(30, n)), 2),
                            "current_streak": cur, "longest_streak": longest,
                            "best_day": best}}
    return cached("play-daily", 300, build)


def play_rhythm():
    """Weekday playtime profile + weekly totals + my hourly playing pattern."""
    def build():
        weekday = q("""
            SELECT CAST(strftime('%w', date) AS INTEGER) AS wd,
                   COUNT(*) AS days,
                   SUM(CASE WHEN h > 0 THEN 1 ELSE 0 END) AS played_days,
                   ROUND(AVG(h), 2) AS avg_h, ROUND(MAX(h), 2) AS max_h
            FROM (SELECT date, SUM(daily_playtime)/60.0 AS h FROM daily_snapshots GROUP BY date)
            GROUP BY wd ORDER BY wd
        """)
        weeks = q("""
            SELECT strftime('%Y-%W', date) AS wk, COUNT(DISTINCT date) AS days,
                   ROUND(SUM(daily_playtime)/60.0, 1) AS hours
            FROM daily_snapshots
            WHERE date >= date((SELECT MAX(date) FROM daily_snapshots), '-55 days')
            GROUP BY wk ORDER BY wk
        """)
        me_hourly = {f"{i:02d}": 0 for i in range(24)}
        try:
            for r in q("""
                SELECT strftime('%H', timestamp, '+8 hours') AS h, COUNT(*) AS n
                FROM status_polls WHERE personastate > 0
                GROUP BY h ORDER BY h
            """):
                me_hourly[r["h"]] = r["n"]
        except sqlite3.OperationalError:
            pass
        return {"updated_at": now_iso(), "weekday": weekday, "weeks": weeks, "me_hourly": me_hourly}
    return cached("play-rhythm", 600, build)


def movers():
    """2-week momentum: latest recent_sessions snapshot vs the previous one."""
    def build():
        dates = q("SELECT DISTINCT snapshot_date AS d FROM recent_sessions ORDER BY d DESC LIMIT 2")
        if len(dates) < 2:
            return {"updated_at": now_iso(), "as_of": None, "prev": None,
                    "gap_days": None, "gainers": [], "losers": []}
        as_of, prev = dates[0]["d"], dates[1]["d"]
        rows = q("""
            SELECT c.appid, COALESCE(c.name, 'App ' || c.appid) AS name,
                   c.playtime_2weeks AS now_2w, COALESCE(p.playtime_2weeks, 0) AS prev_2w,
                   c.playtime_forever AS now_total, COALESCE(p.playtime_forever, 0) AS prev_total
            FROM recent_sessions c
            LEFT JOIN recent_sessions p ON p.appid = c.appid AND p.snapshot_date = ?
            WHERE c.snapshot_date = ?
        """, (prev, as_of))
        gap = q("SELECT CAST(julianday(?) - julianday(?) AS INTEGER) AS g", (as_of, prev))[0]["g"]
        for r in rows:
            r["d_total"] = (r["now_total"] or 0) - (r["prev_total"] or 0)
            r["d_2w"] = (r["now_2w"] or 0) - (r["prev_2w"] or 0)
            r["hours_now_2w"] = round((r["now_2w"] or 0) / 60.0, 1)
        gainers = sorted([r for r in rows if r["d_total"] > 0], key=lambda x: -x["d_total"])[:8]
        losers = sorted([r for r in rows if r["d_total"] < 0], key=lambda x: x["d_total"])[:5]
        return {"updated_at": now_iso(), "as_of": as_of, "prev": prev, "gap_days": gap,
                "gainers": gainers, "losers": losers}
    return cached("movers", 300, build)


def genres():
    """Genre mix (hours-weighted, json_each over game_details.genres) + monthly taste drift."""
    def build():
        try:
            mix = q("""
                SELECT j.value AS genre, COUNT(*) AS games,
                       ROUND(SUM(o.playtime_forever)/60.0, 1) AS hours
                FROM game_details d
                JOIN json_each(d.genres) j
                JOIN owned_games o ON o.appid = d.appid
                GROUP BY j.value ORDER BY hours DESC LIMIT 14
            """)
            drift = q("""
                SELECT strftime('%Y-%m', s.date) AS ym, j.value AS genre,
                       ROUND(SUM(s.daily_playtime)/60.0, 1) AS hours
                FROM daily_snapshots s
                JOIN game_details d ON d.appid = s.appid
                JOIN json_each(d.genres) j
                WHERE s.daily_playtime > 0
                GROUP BY ym, j.value ORDER BY ym DESC, hours DESC
            """)
        except sqlite3.OperationalError:
            mix, drift = [], []
        cov = q("""
            SELECT (SELECT COUNT(*) FROM owned_games) AS owned,
                   (SELECT COUNT(*) FROM game_details) AS detailed,
                   (SELECT SUM(playtime_forever) FROM owned_games) AS total_min,
                   (SELECT SUM(o.playtime_forever) FROM owned_games o
                      JOIN game_details d ON d.appid = o.appid) AS mapped_min
        """)[0]
        months = {}
        for r in drift:
            months.setdefault(r["ym"], []).append({"genre": r["genre"], "hours": r["hours"]})
        drift_out = [{"ym": ym, "top": v[:5],
                      "total_hours": round(sum(x["hours"] for x in v), 1)}
                     for ym, v in sorted(months.items(), reverse=True)[:6]]
        return {"updated_at": now_iso(), "mix": mix, "drift": drift_out, "coverage": cov}
    return cached("genres", 900, build)


def library_value():
    """Captured list-price value of the library (hours-weighted coverage, FX->USD)."""
    def build():
        try:
            rows = q("""
                SELECT d.appid, d.name,
                       json_extract(d.price_overview, '$.currency') AS cc,
                       json_extract(d.price_overview, '$.final') / 100.0 AS price,
                       json_extract(d.price_overview, '$.initial') / 100.0 AS list_price,
                       json_extract(d.price_overview, '$.final_formatted') AS fmt,
                       COALESCE(o.playtime_forever, 0) AS minutes,
                       COALESCE(o.rtime_last_played, 0) AS rtime
                FROM game_details d LEFT JOIN owned_games o ON o.appid = d.appid
                WHERE d.price_overview IS NOT NULL AND json_valid(d.price_overview)
                  AND json_extract(d.price_overview, '$.final') > 0
            """)
            cov = q("""
                SELECT (SELECT COUNT(*) FROM owned_games) AS owned,
                       (SELECT SUM(playtime_forever) FROM owned_games) AS total_min,
                       (SELECT SUM(o.playtime_forever) FROM owned_games o
                          JOIN game_details d ON d.appid = o.appid) AS mapped_min
            """)[0]
        except sqlite3.OperationalError:
            rows = []
            cov = {"owned": 0, "total_min": 0, "mapped_min": 0}
        def usd(x, cc):
            return (x or 0) * FX_TO_USD.get(cc, 1.0)
        value = sum(usd(r["price"], r["cc"]) for r in rows)
        listv = sum(usd(r["list_price"], r["cc"]) for r in rows)
        hours = sum((r["minutes"] or 0) for r in rows) / 60.0
        cutoff = time.time() - 365 * 86400
        dormant_usd = sum(usd(r["price"], r["cc"]) for r in rows if r["rtime"] and r["rtime"] < cutoff)
        dormant_n = sum(1 for r in rows if r["rtime"] and r["rtime"] < cutoff)
        top = sorted(rows, key=lambda r: -usd(r["price"], r["cc"]))[:10]
        top_out = [{"name": r["name"], "fmt": r["fmt"],
                    "usd": round(usd(r["price"], r["cc"]), 2),
                    "hours": round((r["minutes"] or 0) / 60.0, 1),
                    "usd_per_hour": round(usd(r["price"], r["cc"]) / max(0.1, (r["minutes"] or 0) / 60.0), 3)}
                   for r in top]
        hours_pct = round(100.0 * (cov["mapped_min"] or 0) / cov["total_min"], 1) if cov["total_min"] else 0.0
        return {"updated_at": now_iso(),
                "summary": {"owned": cov["owned"], "priced": len(rows),
                            "value_usd": round(value, 2), "list_usd": round(listv, 2),
                            "saved_usd": round(listv - value, 2),
                            "hours": round(hours, 0),
                            "usd_per_hour": round(value / max(1.0, hours), 3),
                            "dormant_usd": round(dormant_usd, 2), "dormant_n": dormant_n,
                            "hours_pct": hours_pct},
                "top_value": top_out}
    return cached("library-value", 900, build)


def platform():
    """Playtime split across Steam platforms (windows/mac/linux/deck)."""
    def build():
        r = q("""
            SELECT COUNT(*) AS owned,
                   SUM(playtime_windows_forever) AS win, SUM(playtime_mac_forever) AS mac,
                   SUM(playtime_linux_forever) AS lin, SUM(playtime_deck_forever) AS deck,
                   SUM(playtime_forever) AS total,
                   SUM(playtime_windows_forever > 0) AS win_games,
                   SUM(playtime_mac_forever > 0) AS mac_games,
                   SUM(playtime_linux_forever > 0) AS lin_games,
                   SUM(playtime_deck_forever > 0) AS deck_games
            FROM owned_games
        """)[0]
        total = r["total"] or 0
        out = {}
        for k in ("win", "mac", "lin", "deck"):
            mins = r[k] or 0
            out[k] = {"minutes": mins, "hours": round(mins / 60.0, 1),
                      "games": r[f"{k}_games"] or 0,
                      "pct": round(100.0 * mins / total, 2) if total else 0.0}
        top_deck = q("SELECT name, ROUND(playtime_deck_forever/60.0,1) AS hours FROM owned_games WHERE playtime_deck_forever > 0 ORDER BY 2 DESC LIMIT 3")
        top_mac = q("SELECT name, ROUND(playtime_mac_forever/60.0,1) AS hours FROM owned_games WHERE playtime_mac_forever > 0 ORDER BY 2 DESC LIMIT 3")
        return {"updated_at": now_iso(), "owned": r["owned"], "platform": out,
                "total_hours": round(total / 60.0, 1), "top_deck": top_deck, "top_mac": top_mac}
    return cached("platform", 600, build)


def rare_achievements():
    """Rarest unlocked achievements (global_percent) + recent unlock feed."""
    def build():
        try:
            rare = q("""
                SELECT game, apiname, pct, unlocked_on, days_ago FROM (
                    SELECT COALESCE(og.name, gd.name, 'app ' || ga.appid) AS game,
                           ga.apiname AS apiname,
                           ROUND(CAST(ga.global_percent AS REAL), 2) AS pct,
                           date(ga.unlocktime, 'unixepoch', '+8 hours') AS unlocked_on,
                           CAST((strftime('%s','now') - ga.unlocktime) / 86400 AS INTEGER) AS days_ago,
                           ROW_NUMBER() OVER (PARTITION BY ga.appid
                             ORDER BY CAST(ga.global_percent AS REAL) ASC) AS rn
                    FROM game_achievements ga
                    LEFT JOIN owned_games og ON og.appid = ga.appid
                    LEFT JOIN game_details gd ON gd.appid = ga.appid
                    WHERE ga.achieved = 1 AND ga.unlocktime > 0
                      AND CAST(ga.global_percent AS REAL) > 0
                ) WHERE rn <= 2 ORDER BY pct ASC LIMIT 15
            """)
            totals = q("""
                SELECT COUNT(*) AS total,
                       SUM(CASE WHEN unlocktime >= strftime('%s','now','-30 days') THEN 1 ELSE 0 END) AS last30
                FROM game_achievements WHERE achieved = 1
            """)[0]
        except sqlite3.OperationalError:
            rare = []
            totals = {"total": 0, "last30": 0}

        def label(a):
            s = (a or "").replace("_", " ").strip()
            return s.title() if s.upper() == s or s.lower() == s else s
        for r in rare:
            r["label"] = label(r["apiname"])
        return {"updated_at": now_iso(), "rare": rare,
                "total": totals["total"] or 0, "last30": totals["last30"] or 0}
    return cached("rare-achievements", 900, build)


def friend_heat():
    """Friends' 24x7 activity grid (120d polls) + this-week leaders + 24h playing curve."""
    def build():
        try:
            cells = q("""
                SELECT CAST(strftime('%H', timestamp, '+8 hours') AS INTEGER) AS h,
                       CAST(strftime('%w', timestamp, '+8 hours') AS INTEGER) AS wd,
                       COUNT(*) AS n
                FROM friend_status_polls
                WHERE timestamp >= strftime('%s','now','-120 days')
                GROUP BY h, wd
            """)
            week = q("""
                SELECT COALESCE(c.personaname, fp.steamid) AS name,
                       COUNT(*) / 60.0 AS poll_hours
                FROM friend_status_polls fp
                LEFT JOIN friends_current c ON c.steamid = fp.steamid
                WHERE fp.gameextrainfo IS NOT NULL AND fp.gameextrainfo != ''
                  AND fp.timestamp >= strftime('%s','now','-7 days')
                GROUP BY fp.steamid ORDER BY poll_hours DESC LIMIT 8
            """)
            curve_rows = q("""
                SELECT strftime('%H', timestamp, '+8 hours') AS h, COUNT(DISTINCT steamid) AS n
                FROM friend_status_polls
                WHERE gameextrainfo != '' AND timestamp >= strftime('%s','now','-1 days')
                GROUP BY h
            """)
        except sqlite3.OperationalError:
            cells, week, curve_rows = [], [], []
        grid = [[0] * 24 for _ in range(7)]
        for r in cells:
            if 0 <= r["wd"] <= 6 and 0 <= r["h"] <= 23:
                grid[r["wd"]][r["h"]] = r["n"]
        for r in week:
            r["poll_hours"] = round(r["poll_hours"] or 0, 1)
        curve = {f"{i:02d}": 0 for i in range(24)}
        for r in curve_rows:
            curve[r["h"]] = r["n"]
        return {"updated_at": now_iso(), "grid": grid, "week": week, "curve": curve}
    return cached("friend-heat", 1800, build)


def coplay():
    """Same day+hour buckets where me and friends were in the same game (30d)."""
    def build():
        try:
            rows = q("""
                WITH me AS (
                    SELECT date(timestamp, '+8 hours') AS d,
                           strftime('%H', timestamp, '+8 hours') AS h,
                           gameid, COUNT(*) AS my_n
                    FROM status_polls
                    WHERE gameid IS NOT NULL AND gameid != ''
                      AND timestamp >= strftime('%s','now','-30 days')
                    GROUP BY d, h, gameid
                ),
                fr AS (
                    SELECT date(timestamp, '+8 hours') AS d,
                           strftime('%H', timestamp, '+8 hours') AS h,
                           gameid, COUNT(DISTINCT steamid) AS friends
                    FROM friend_status_polls
                    WHERE gameid IS NOT NULL AND gameid != ''
                      AND timestamp >= strftime('%s','now','-30 days')
                    GROUP BY d, h, gameid
                )
                SELECT fr.d AS d, fr.h AS h,
                       COALESCE(og.name, 'app ' || fr.gameid) AS name,
                       m.my_n AS my_polls, fr.friends AS friends
                FROM fr JOIN me ON me.d = fr.d AND me.h = fr.h AND me.gameid = fr.gameid
                LEFT JOIN owned_games og ON og.appid = CAST(fr.gameid AS INTEGER)
                ORDER BY fr.d DESC, fr.h DESC LIMIT 30
            """)
            total = q("""
                SELECT COUNT(*) AS n FROM (
                    SELECT date(timestamp,'+8 hours') AS d, strftime('%H',timestamp,'+8 hours') AS h, gameid
                    FROM status_polls WHERE gameid != '' AND timestamp >= strftime('%s','now','-30 days')
                    GROUP BY d, h, gameid
                    INTERSECT
                    SELECT date(timestamp,'+8 hours') AS d, strftime('%H',timestamp,'+8 hours') AS h, gameid
                    FROM friend_status_polls WHERE gameid != '' AND timestamp >= strftime('%s','now','-30 days')
                    GROUP BY d, h, gameid
                )
            """)[0]["n"]
        except sqlite3.OperationalError:
            rows, total = [], 0
        return {"updated_at": now_iso(), "total_30d": total, "moments": rows}
    return cached("coplay", 1800, build)


def news_pulse():
    """News volume per day + feed source mix + hottest updated games."""
    def build():
        try:
            per_day = q("""
                SELECT date(date, 'unixepoch', '+8 hours') AS d, COUNT(*) AS n
                FROM game_news_updates
                WHERE date >= strftime('%s','now','-14 days')
                GROUP BY d ORDER BY d
            """)
            sources = q("""
                SELECT COALESCE(NULLIF(feedlabel, ''), NULLIF(feedname, ''), '?') AS src, COUNT(*) AS n
                FROM game_news_updates
                WHERE date >= strftime('%s','now','-30 days')
                GROUP BY src ORDER BY n DESC LIMIT 6
            """)
            hot = q("""
                SELECT game_name, COUNT(*) AS n
                FROM game_news_updates
                WHERE date >= strftime('%s','now','-14 days')
                GROUP BY game_name ORDER BY n DESC LIMIT 6
            """)
        except sqlite3.OperationalError:
            per_day, sources, hot = [], [], []
        return {"updated_at": now_iso(), "per_day": per_day, "sources": sources, "hot_games": hot}
    return cached("news-pulse", 900, build)


class Handler(BaseHTTPRequestHandler):
    server_version = "SteamMatrixAPI/1.0"
    _rate = {}  # client_ip -> [timestamp, count]
    RATE_LIMIT = 600  # max requests per minute per client (terminal makes ~30/min)

    def _check_rate(self):
        """Simple in-memory rate limiter per client IP."""
        client = self.client_address[0]
        now = time.time()
        entry = Handler._rate.get(client)
        if entry is None or now - entry[0] > 60:
            Handler._rate[client] = [now, 1]
            return True
        entry[1] += 1
        if entry[1] > self.RATE_LIMIT:
            return False
        return True

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._check_rate():
            self.send_json(429, {"error": "rate limited"})
            return
        try:
            u = urlparse(self.path)
            path = u.path.rstrip("/") or "/"
            qs = parse_qs(u.query)
            limit = min(int((qs.get("limit") or ["100"])[0]), 2000)

            if path == "/api/status":
                self.send_json(200, status())
            elif path == "/api/me":
                self.send_json(200, me())
            elif path == "/api/friends":
                self.send_json(200, friends())
            elif path.startswith("/api/friend/"):
                self.send_json(200, friend_detail(path.split("/")[-1]))
            elif path == "/api/leaderboards":
                self.send_json(200, leaderboards())
            elif path == "/api/shared":
                self.send_json(200, shared(limit))
            elif path == "/api/games":
                self.send_json(200, games(limit))
            elif path == "/api/recent-2week":
                self.send_json(200, recent_two_week())
            elif path == "/api/polls":
                self.send_json(200, polls(limit))
            elif path == "/api/friend-polls":
                self.send_json(200, friend_polls(limit))
            elif path == "/api/sweeps":
                self.send_json(200, sweeps())
            elif path == "/api/news":
                self.send_json(200, news(limit))
            elif path == "/api/stats":
                self.send_json(200, stats())
            elif path == "/api/hot-week":
                self.send_json(200, hot_week(limit))
            elif path == "/api/hourly":
                self.send_json(200, hourly())
            elif path == "/api/night-owls":
                self.send_json(200, night_owls(limit))
            elif path == "/api/presence-daily":
                days = min(int((qs.get("days") or ["14"])[0]), 30)
                self.send_json(200, presence_daily(days))
            elif path == "/api/presence-today":
                self.send_json(200, presence_today())
            elif path == "/api/records":
                self.send_json(200, records())
            elif path == "/api/bans":
                self.send_json(200, bans())
            elif path == "/api/levels":
                self.send_json(200, levels())
            elif path == "/api/badges":
                self.send_json(200, badges())
            elif path == "/api/concurrent":
                self.send_json(200, concurrent())
            elif path == "/api/countries":
                self.send_json(200, countries())
            elif path == "/api/play-daily":
                days = min(max(int((qs.get("days") or ["60"])[0]), 7), 120)
                self.send_json(200, play_daily(days))
            elif path == "/api/play-rhythm":
                self.send_json(200, play_rhythm())
            elif path == "/api/movers":
                self.send_json(200, movers())
            elif path == "/api/genres":
                self.send_json(200, genres())
            elif path == "/api/library-value":
                self.send_json(200, library_value())
            elif path == "/api/platform":
                self.send_json(200, platform())
            elif path == "/api/rare-achievements":
                self.send_json(200, rare_achievements())
            elif path == "/api/friend-heat":
                self.send_json(200, friend_heat())
            elif path == "/api/coplay":
                self.send_json(200, coplay())
            elif path == "/api/news-pulse":
                self.send_json(200, news_pulse())
            elif path == "/api/achieve-compare":
                self.send_json(200, achieve_compare())
            elif path == "/api/raw":
                table = (qs.get("table") or [""])[0]
                payload = raw(table, limit)
                if payload is None:
                    self.send_json(400, {"error": "table not whitelisted", "allowed": sorted(RAW_TABLES)})
                else:
                    self.send_json(200, payload)
            elif path in ("/health", "/api/health"):
                self.send_json(200, {"ok": True, "updated_at": now_iso()})
            else:
                self.send_json(404, {"error": "not found",
                                     "endpoints": ["/api/status", "/api/me", "/api/friends",
                                                   "/api/friend/<steamid>", "/api/leaderboards",
                                                   "/api/shared", "/api/games", "/api/polls",
                                                   "/api/friend-polls", "/api/sweeps", "/api/news",
                                                   "/api/stats", "/api/raw?table=..."]})
        except Exception:
            self.send_json(500, {"error": "internal error"})

    def log_message(self, fmt, *args):
        pass


def main():
    print(f"steam-matrix-api on :{PORT} db={DB}", flush=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
