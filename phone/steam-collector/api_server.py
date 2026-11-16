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
    games = q("""
        SELECT fg.appid, COALESCE(og.name, 'App ' || fg.appid) AS name,
               fg.playtime_forever, fg.playtime_2weeks, fg.rtime_last_played
        FROM friend_games fg
        LEFT JOIN owned_games og ON og.appid = fg.appid
        WHERE fg.steamid = ?
        ORDER BY fg.playtime_forever DESC LIMIT 100
    """, (steamid,))
    for g in games:
        g["hours"] = round((g["playtime_forever"] or 0) / 60.0, 1)
    return {"updated_at": now_iso(), "steamid": steamid,
            "live": meta[0] if meta else None,
            "sweep": sweep[0] if sweep else None,
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


def stats():
    return {"updated_at": now_iso(), "tables": table_counts()}


def raw(table, limit):
    if table not in RAW_TABLES:
        return None
    return {"updated_at": now_iso(), "table": table,
            "rows": q(f'SELECT * FROM "{table}" LIMIT ?', (limit,))}


class Handler(BaseHTTPRequestHandler):
    server_version = "SteamMatrixAPI/1.0"

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
        except Exception as exc:  # keep the server alive on any handler error
            self.send_json(500, {"error": str(exc)})

    def log_message(self, fmt, *args):
        pass


def main():
    print(f"steam-matrix-api on :{PORT} db={DB}", flush=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
