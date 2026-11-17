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


class Handler(BaseHTTPRequestHandler):
    server_version = "SteamMatrixAPI/1.0"
    _rate = {}  # client_ip -> [timestamp, count]
    RATE_LIMIT = 60  # max requests per minute per client

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
