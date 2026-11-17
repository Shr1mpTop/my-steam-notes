#!/usr/bin/env python3
"""Steam collector for M11P phone server — minute-level polling into LOCAL SQLite.

The phone IS the database host now (7x24, like stockbot):
  - every POLL_INTERVAL      (60s)  own presence            -> status_polls
  - every FRIEND_INTERVAL    (60s)  friends presence        -> steam_friends / friend_status_polls
                                    (self + 39 friends ride ONE batched GetPlayerSummaries call
                                     — 100 steamids fit in a single request, zero extra cost)
  - every FRIENDLIST_INTERVAL(1800s) friend roster refresh  -> steam_friends
  - every PLAYTIME_INTERVAL  (300s) owned + recent games    -> owned_games / daily_snapshots
                                                            / recent_sessions / player_daily
  - daily (04:00 window)            prune raw poll rows     -> retention cleanup
  - self state change               touch TRIGGER_FILE      -> dashboard rebuild within 5s

Rate-limit behavior (official cap 100,000 calls/day/key; since 2025-06 Steam
throttles profile endpoints hard on bursts, 429 + Retry-After 60-120s):
  - 429 -> honor Retry-After (>=60s), escalate after a streak, retry in-round
  - 5xx / timeout -> short backoff retries, never crash the loop
Defaults cost ~1 Steam call/minute (~1.5k/day = 1.5% of quota).

Storage: SQLite (WAL) at STEAM_DB_PATH (default /sdcard/steam-notes/steam.db),
same schema as the old Turso cloud DB. Self-contained: stdlib + requests.
Config via .env next to this file.
"""
import json
import os
import random
import sqlite3
import sys
import threading
import time
import traceback
from datetime import datetime, timezone, timedelta

import requests

TZ = timezone(timedelta(hours=8))
STEAM_API = "https://api.steampowered.com"
STEAM_SUMMARY_CHUNK_SIZE = 100  # documented max steamids per GetPlayerSummaries call
BACKOFFS = (10, 30, 60)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_CANDIDATES = [
    os.path.join(SCRIPT_DIR, ".env"),
    "/root/steam-notes/phone/steam-collector/.env",
    "/root/steam-notes/.env",
]

FRIEND_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS steam_friends (
        steamid TEXT PRIMARY KEY,
        relationship TEXT,
        friend_since INTEGER DEFAULT 0,
        personaname TEXT,
        avatarfull TEXT,
        profileurl TEXT,
        last_seen_at TEXT,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS friend_status_polls (
        timestamp TEXT NOT NULL,
        steamid TEXT NOT NULL,
        personaname TEXT,
        personastate INTEGER,
        gameextrainfo TEXT,
        gameid TEXT,
        lastlogoff INTEGER DEFAULT 0,
        avatarfull TEXT,
        profileurl TEXT,
        PRIMARY KEY (timestamp, steamid)
    )""",
    """CREATE INDEX IF NOT EXISTS idx_friend_status_polls_steamid_time
       ON friend_status_polls (steamid, timestamp)""",
    """CREATE INDEX IF NOT EXISTS idx_friend_status_polls_game_time
       ON friend_status_polls (gameid, timestamp)""",
]

CORE_TABLES = ("status_polls", "owned_games", "daily_snapshots", "recent_sessions", "player_daily")

SOCIAL_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS friend_games (
        steamid TEXT NOT NULL,
        appid INTEGER NOT NULL,
        playtime_forever INTEGER DEFAULT 0,
        playtime_2weeks INTEGER DEFAULT 0,
        rtime_last_played INTEGER DEFAULT 0,
        updated_at TEXT,
        PRIMARY KEY (steamid, appid)
    )""",
    """CREATE INDEX IF NOT EXISTS idx_friend_games_steamid ON friend_games (steamid, playtime_forever DESC)""",
    """CREATE INDEX IF NOT EXISTS idx_friend_games_appid ON friend_games (appid)""",
    """CREATE TABLE IF NOT EXISTS friend_sweeps (
        steamid TEXT PRIMARY KEY,
        last_sweep TEXT,
        status TEXT,
        game_count INTEGER DEFAULT 0,
        total_minutes INTEGER DEFAULT 0
    )""",
    """CREATE TABLE IF NOT EXISTS friends_current (
        steamid TEXT PRIMARY KEY,
        personaname TEXT,
        personastate INTEGER DEFAULT 0,
        gameextrainfo TEXT,
        gameid TEXT,
        lastlogoff INTEGER DEFAULT 0,
        avatarfull TEXT,
        profileurl TEXT,
        loccountrycode TEXT,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS friend_bans (
        steamid TEXT PRIMARY KEY,
        community_banned INTEGER DEFAULT 0,
        vac_banned INTEGER DEFAULT 0,
        num_vac_bans INTEGER DEFAULT 0,
        days_since_last_ban INTEGER DEFAULT 0,
        num_game_bans INTEGER DEFAULT 0,
        economy_ban TEXT,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS friend_levels (
        steamid TEXT PRIMARY KEY,
        player_level INTEGER DEFAULT 0,
        player_xp INTEGER DEFAULT 0,
        xp_to_level_up INTEGER DEFAULT 0,
        badges_count INTEGER DEFAULT 0,
        status TEXT,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS game_concurrent (
        appid INTEGER NOT NULL,
        ts INTEGER NOT NULL,
        player_count INTEGER,
        PRIMARY KEY (appid, ts)
    )""",
    """CREATE INDEX IF NOT EXISTS idx_game_concurrent_appid ON game_concurrent (appid, ts DESC)""",
]

SQL_OWNED_UPSERT = """INSERT INTO owned_games (appid, name, playtime_forever, playtime_windows_forever,
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
     updated_at=excluded.updated_at"""

SQL_SNAPSHOT_UPSERT = """INSERT INTO daily_snapshots (date, appid, name, playtime_forever, daily_playtime)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(date, appid) DO UPDATE SET
     name=excluded.name,
     playtime_forever=excluded.playtime_forever,
     daily_playtime=excluded.daily_playtime"""

SQL_RECENT_REPLACE = """INSERT OR REPLACE INTO recent_sessions (snapshot_date, appid, name, playtime_2weeks, playtime_forever)
   VALUES (?, ?, ?, ?, ?)"""

SQL_PLAYER_DAILY = """INSERT OR REPLACE INTO player_daily (date, personaname, personastate, gameextrainfo, gameid, lastlogoff, loccountrycode)
   VALUES (?, ?, ?, ?, ?, ?, ?)"""

SQL_FRIEND_BASE_UPSERT = """INSERT INTO steam_friends (steamid, relationship, friend_since, updated_at)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     relationship=excluded.relationship,
     friend_since=excluded.friend_since,
     updated_at=excluded.updated_at"""

SQL_FRIEND_PROFILE_UPSERT = """INSERT INTO steam_friends (steamid, personaname, avatarfull, profileurl, last_seen_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     personaname=excluded.personaname,
     avatarfull=excluded.avatarfull,
     profileurl=excluded.profileurl,
     last_seen_at=excluded.last_seen_at,
     updated_at=excluded.updated_at"""

SQL_FRIEND_POLL_INSERT = """INSERT OR IGNORE INTO friend_status_polls
   (timestamp, steamid, personaname, personastate, gameextrainfo, gameid, lastlogoff, avatarfull, profileurl)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""

SQL_STATUS_INSERT = """INSERT OR IGNORE INTO status_polls (timestamp, personastate, gameextrainfo, gameid)
   VALUES (?, ?, ?, ?)"""

SQL_FRIENDS_CURRENT_UPSERT = """INSERT INTO friends_current (steamid, personaname, personastate, gameextrainfo, gameid, lastlogoff, avatarfull, profileurl, loccountrycode, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     personaname=excluded.personaname, personastate=excluded.personastate,
     gameextrainfo=excluded.gameextrainfo, gameid=excluded.gameid,
     lastlogoff=excluded.lastlogoff, avatarfull=excluded.avatarfull,
     profileurl=excluded.profileurl, loccountrycode=excluded.loccountrycode,
     updated_at=excluded.updated_at"""

SQL_FRIEND_BAN_UPSERT = """INSERT INTO friend_bans (steamid, community_banned, vac_banned, num_vac_bans, days_since_last_ban, num_game_bans, economy_ban, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     community_banned=excluded.community_banned, vac_banned=excluded.vac_banned,
     num_vac_bans=excluded.num_vac_bans, days_since_last_ban=excluded.days_since_last_ban,
     num_game_bans=excluded.num_game_bans, economy_ban=excluded.economy_ban,
     updated_at=excluded.updated_at"""

SQL_FRIEND_LEVEL_UPSERT = """INSERT INTO friend_levels (steamid, player_level, player_xp, xp_to_level_up, badges_count, status, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     player_level=excluded.player_level, player_xp=excluded.player_xp,
     xp_to_level_up=excluded.xp_to_level_up, badges_count=excluded.badges_count,
     status=excluded.status, updated_at=excluded.updated_at"""

SQL_CONCURRENT_INSERT = """INSERT OR REPLACE INTO game_concurrent (appid, ts, player_count)
   VALUES (?, ?, ?)"""

SQL_FRIEND_GAME_REPLACE = """INSERT OR REPLACE INTO friend_games (steamid, appid, playtime_forever, playtime_2weeks, rtime_last_played, updated_at)
   VALUES (?, ?, ?, ?, ?, ?)"""

SQL_SWEEP_UPSERT = """INSERT INTO friend_sweeps (steamid, last_sweep, status, game_count, total_minutes)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(steamid) DO UPDATE SET
     last_sweep=excluded.last_sweep, status=excluded.status,
     game_count=excluded.game_count, total_minutes=excluded.total_minutes"""


# ---------------------------------------------------------------- config / env
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
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k:
                    os.environ.setdefault(k, v)


def log(msg):
    print(f"{datetime.now(TZ).isoformat()} {msg}", flush=True)


# ---------------------------------------------------------------- sqlite client
DB_LOCK = threading.Lock()
DB_CONN = None
DB_PATH = ""


def init_db():
    global DB_CONN, DB_PATH
    DB_PATH = os.getenv("STEAM_DB_PATH", "/sdcard/steam-notes/steam.db")
    d = os.path.dirname(DB_PATH)
    if d:
        os.makedirs(d, exist_ok=True)
    DB_CONN = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
    DB_CONN.row_factory = sqlite3.Row
    DB_CONN.execute("PRAGMA journal_mode=WAL")
    DB_CONN.execute("PRAGMA busy_timeout=30000")
    DB_CONN.execute("PRAGMA foreign_keys=ON")


def execute(sql, args=None):
    with DB_LOCK:
        cur = DB_CONN.execute(sql, tuple(args) if args else ())
        rows = [dict(r) for r in cur.fetchall()]
        DB_CONN.commit()
        return rows


def execute_many(sql, args_list):
    if not args_list:
        return
    with DB_LOCK:
        DB_CONN.executemany(sql, [tuple(a) for a in args_list])
        DB_CONN.commit()


# ---------------------------------------------------------------- steam client
FOUR29_STREAK = 0
STEAM_CALLS = 0
PROXY = None
DIRECT_FAIL_UNTIL = 0.0  # circuit breaker: go proxy-first for 10 min after direct failures


def steam_get(path, params, timeout=20):
    """GET a Steam Web API endpoint. Returns parsed json or None (give up this round).

    Direct-first with PC-Clash proxy fallback (api.steampowered.com is
    intermittently throttled from CN networks):
      attempts 1-2 direct, 3-4 via FALLBACK_PROXY.
    429 -> sleep per Retry-After (>=60s, escalate after streak), then retry.
    5xx / network errors -> short backoff retries.
    Other 4xx -> permanent for this round, return None immediately.
    """
    global FOUR29_STREAK, STEAM_CALLS, DIRECT_FAIL_UNTIL
    url = f"{STEAM_API}{path}"
    p = {"key": KEY, "format": "json", **params}
    # circuit breaker: after repeated direct failures go proxy-first for 10 min
    direct_dead = time.time() < DIRECT_FAIL_UNTIL
    proxies_chain = [PROXY, PROXY, None, None] if direct_dead else [None, None, PROXY, PROXY]
    for attempt in range(4):
        kw = {}
        if proxies_chain[attempt]:
            kw["proxies"] = {"http": proxies_chain[attempt], "https": proxies_chain[attempt]}
        try:
            resp = SESSION.get(url, params=p, timeout=timeout, **kw)
        except requests.RequestException as exc:
            wait = BACKOFFS[min(attempt, len(BACKOFFS) - 1)]
            if proxies_chain[attempt] is None:
                DIRECT_FAIL_UNTIL = time.time() + 600  # breaker: proxy-first for 10 min
            log(f"[steam] network error on {path} (via {'proxy' if proxies_chain[attempt] else 'direct'}): {exc} -> retry in {wait}s")
            time.sleep(wait)
            continue
        STEAM_CALLS += 1
        if resp.status_code == 200:
            FOUR29_STREAK = 0
            return resp.json()
        if resp.status_code == 429:
            try:
                retry_after = int(resp.headers.get("Retry-After", "90"))
            except ValueError:
                retry_after = 90
            wait = max(retry_after, 60) + random.randint(0, 15)
            FOUR29_STREAK += 1
            if FOUR29_STREAK >= 3:
                wait += 240  # escalate: we are clearly in a throttle window
            log(f"[steam] 429 on {path} (streak {FOUR29_STREAK}) -> sleep {wait}s")
            time.sleep(wait)
            continue
        if resp.status_code >= 500:
            wait = BACKOFFS[min(attempt, len(BACKOFFS) - 1)]
            log(f"[steam] HTTP {resp.status_code} on {path} -> retry in {wait}s")
            time.sleep(wait)
            continue
        log(f"[steam] permanent HTTP {resp.status_code} on {path}: {resp.text[:200]}")
        return None
    return None


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


# ---------------------------------------------------------------- collectors
STATE = {
    "friend_ids": [],
    "pt_map": {},       # appid -> playtime_forever as of last playtime tick
    "prev_map": {},     # appid -> playtime_forever of last snapshot day < TODAY
    "last_full_day": "",
    "next_friend": 0.0,
    "next_friendlist": 0.0,
    "next_playtime": 0.0,
    "last_prune_day": "",
    "last_self": {},    # previous tick self presence (for change detection)
    "sweep_cursor": 0,  # round-robin cursor into friend_ids for library sweeps
    "sweep_cycles": 0,  # completed full-rotations (for logging)
    "next_concurrent": 0.0,
}
TICKS = 0
ERRORS = 0
FRIEND_POLLS = 0
PLAYTIME_POLLS = 0
SWEEPS_DONE = 0
START_TS = time.time()


def poll_self():
    """One GetPlayerSummaries call for self; write one status_polls row."""
    data = steam_get("/ISteamUser/GetPlayerSummaries/v0002/", {"steamids": SID})
    if data is None:
        return None
    players = data.get("response", {}).get("players", [])
    if not players:
        log("[self] empty players response")
        return None
    p = players[0]
    now = datetime.now(TZ).isoformat()
    execute(SQL_STATUS_INSERT, [now, p.get("personastate", 0), p.get("gameextrainfo", ""), p.get("gameid", "")])
    return p


def refresh_friendlist():
    """Refresh the friend roster (rarely changes)."""
    data = steam_get("/ISteamUser/GetFriendList/v0001/", {"steamid": SID, "relationship": "friend"})
    if data is None:
        return False
    friends = data.get("friendslist", {}).get("friends", []) or []
    if not friends:
        log("[friends] empty friend list")
        STATE["friend_ids"] = []
        return True
    now = datetime.now(TZ).isoformat()
    execute_many(SQL_FRIEND_BASE_UPSERT, [
        [f.get("steamid", ""), f.get("relationship", "friend"), f.get("friend_since", 0), now]
        for f in friends if f.get("steamid")
    ])
    STATE["friend_ids"] = [f["steamid"] for f in friends if f.get("steamid")]
    log(f"[friends] roster refreshed: {len(STATE['friend_ids'])} friends")
    return True


def poll_friends_and_self():
    """Batched summaries for self + friends; self row rides the same calls."""
    ids = [SID] + [f for f in STATE["friend_ids"] if f != SID]
    players = []
    for batch in chunks(ids, STEAM_SUMMARY_CHUNK_SIZE):
        data = steam_get("/ISteamUser/GetPlayerSummaries/v0002/", {"steamids": ",".join(batch)})
        if data is None:
            return None
        players.extend(data.get("response", {}).get("players", []))
    if not players:
        return None

    now = datetime.now(TZ).isoformat()
    self_p = next((p for p in players if p.get("steamid") == SID), None)
    if self_p:
        execute(SQL_STATUS_INSERT, [now, self_p.get("personastate", 0),
                                    self_p.get("gameextrainfo", ""), self_p.get("gameid", "")])
    others = [p for p in players if p.get("steamid") and p.get("steamid") != SID]

    execute_many(SQL_FRIEND_PROFILE_UPSERT, [
        [p.get("steamid", ""), p.get("personaname", ""), p.get("avatarfull", ""),
         p.get("profileurl", ""), now, now]
        for p in others
    ])
    # friends_current: latest state per friend in a tiny table the dashboard
    # build can read instantly (no scanning the raw 60s poll history)
    execute_many(SQL_FRIENDS_CURRENT_UPSERT, [
        [p.get("steamid", ""), p.get("personaname", ""), p.get("personastate", 0),
         p.get("gameextrainfo", ""), p.get("gameid", ""), p.get("lastlogoff", 0),
         p.get("avatarfull", ""), p.get("profileurl", ""),
         p.get("loccountrycode", ""), now]
        for p in others
    ])
    execute_many(SQL_FRIEND_POLL_INSERT, [
        [now, p.get("steamid", ""), p.get("personaname", ""), p.get("personastate", 0),
         p.get("gameextrainfo", ""), p.get("gameid", ""), p.get("lastlogoff", 0),
         p.get("avatarfull", ""), p.get("profileurl", "")]
        for p in others
    ])
    playing = [p for p in others if p.get("gameid") or p.get("gameextrainfo")]
    log(f"[friends] polled {len(others)} friends | playing now: {len(playing)}")
    for p in playing[:5]:
        log(f"[friends]   - {p.get('personaname', p.get('steamid'))}: {p.get('gameextrainfo') or p.get('gameid')}")
    return self_p


def sync_playtime():
    """Owned games + recent sessions, intraday-refreshable daily snapshots.

    Full upsert once per day (and at startup); afterwards only rows whose
    playtime_forever changed get written, keeping write volume tiny.
    """
    global PLAYTIME_POLLS
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    data = steam_get("/IPlayerService/GetOwnedGames/v0001/", {
        "steamid": SID,
        "include_appinfo": "true",
        "include_played_free_games": "true",
    }, timeout=30)
    if data is None:
        return False
    games = data.get("response", {}).get("games", []) or []

    full = STATE["last_full_day"] != today
    if full:
        # new day (or first run): baseline = last snapshot day before today
        prev_rows = execute(
            """SELECT appid, playtime_forever FROM daily_snapshots
               WHERE date = (SELECT MAX(date) FROM daily_snapshots WHERE date < ?)""",
            [today],
        )
        STATE["prev_map"] = {r["appid"]: r["playtime_forever"] or 0 for r in prev_rows}
        targets = games
        log(f"[playtime] full sync ({len(games)} games), baseline games={len(STATE['prev_map'])}")
    else:
        targets = [g for g in games if STATE["pt_map"].get(g["appid"]) != g.get("playtime_forever", 0)]

    now_iso = datetime.now(TZ).isoformat()
    owned_args = [
        [g["appid"], g["name"], g.get("playtime_forever", 0),
         g.get("playtime_windows_forever", 0), g.get("playtime_mac_forever", 0),
         g.get("playtime_linux_forever", 0), g.get("playtime_deck_forever", 0),
         g.get("img_icon_url", ""), g.get("rtime_last_played", 0), now_iso]
        for g in targets
    ]
    execute_many(SQL_OWNED_UPSERT, owned_args)

    snapshot_args = [
        [today, g["appid"], g["name"], g.get("playtime_forever", 0),
         max(0, g.get("playtime_forever", 0) - STATE["prev_map"].get(g["appid"], 0))]
        for g in targets
    ]
    execute_many(SQL_SNAPSHOT_UPSERT, snapshot_args)
    for g in targets:
        STATE["pt_map"][g["appid"]] = g.get("playtime_forever", 0)
    STATE["last_full_day"] = today

    # player_daily daily row (cheap, keeps profile fresh)
    ps = steam_get("/ISteamUser/GetPlayerSummaries/v0002/", {"steamids": SID})
    if ps is not None:
        players = ps.get("response", {}).get("players", [])
        if players:
            p = players[0]
            execute(SQL_PLAYER_DAILY, [today, p.get("personaname", ""), p.get("personastate", 0),
                                       p.get("gameextrainfo", ""), p.get("gameid", ""),
                                       p.get("lastlogoff", 0), p.get("loccountrycode", "")])

    # recent sessions (2 weeks)
    rec = steam_get("/IPlayerService/GetRecentlyPlayedGames/v1/", {"steamid": SID})
    if rec is not None:
        rgames = rec.get("response", {}).get("games", []) or []
        if rgames:
            execute_many(SQL_RECENT_REPLACE, [
                [today, g["appid"], g["name"], g.get("playtime_2weeks", 0), g.get("playtime_forever", 0)]
                for g in rgames
            ])
        log(f"[playtime] ok: owned={len(games)} changed={len(targets)} recent={len(rgames)}")

    PLAYTIME_POLLS += 1
    return True


def sweep_friend(steamid):
    """Fetch one friend's owned-games playtime into friend_games.

    GetOwnedGames v1, include_appinfo=false (names resolved from my
    owned_games at build time). Private profiles return an empty response ->
    status='private', retried next cycle anyway (cheap).
    Returns True on any definitive outcome, False on transient failure.
    """
    now_iso = datetime.now(TZ).isoformat()
    data = steam_get("/IPlayerService/GetOwnedGames/v0001/", {
        "steamid": steamid,
        "include_appinfo": "false",
        "include_played_free_games": "true",
    }, timeout=25)
    if data is None:
        return False
    games = data.get("response", {}).get("games", []) or []
    if not games:
        execute(SQL_SWEEP_UPSERT, [steamid, now_iso, "private", 0, 0])
        return True
    total = sum(g.get("playtime_forever", 0) for g in games)
    execute_many(SQL_FRIEND_GAME_REPLACE, [
        [steamid, g["appid"], g.get("playtime_forever", 0),
         g.get("playtime_2weeks", 0), g.get("rtime_last_played", 0), now_iso]
        for g in games
    ])
    execute(SQL_SWEEP_UPSERT, [steamid, now_iso, "ok", len(games), total])
    collect_level_and_badges(steamid)
    return True


def collect_level_and_badges(steamid):
    """Steam level + badges/XP for one friend (single calls, private-tolerant)."""
    now_iso = datetime.now(TZ).isoformat()
    level = steam_get("/IPlayerService/GetSteamLevel/v0001/", {"steamid": steamid})
    lvl = None
    if level is not None:
        lvl = (level.get("response", {}) or {}).get("player_level", 0)
    xp = badge_count = xp_up = None
    badges = steam_get("/IPlayerService/GetBadges/v1/", {"steamid": steamid}, timeout=25)
    if badges is not None:
        resp = badges.get("response", {}) or {}
        xp = resp.get("player_xp", 0)
        badge_count = len(resp.get("badges", []) or [])
        xp_up = resp.get("player_xp_needed_to_level_up", 0)
    status = "ok" if (lvl is not None or xp is not None) else ("private" if lvl is None and xp is None else "ok")
    execute(SQL_FRIEND_LEVEL_UPSERT, [
        steamid, lvl or 0, xp or 0, xp_up or 0, badge_count or 0, status, now_iso
    ])


def bans_batch():
    """GetPlayerBans for me + all friends — ONE batched call per full cycle."""
    ids = [SID] + [f for f in STATE["friend_ids"] if f != SID]
    data = steam_get("/ISteamUser/GetPlayerBans/v1/", {"steamids": ",".join(ids[:100])})
    if data is None:
        return False
    now_iso = datetime.now(TZ).isoformat()
    players = data.get("players", []) or []
    execute_many(SQL_FRIEND_BAN_UPSERT, [
        [p.get("SteamId", ""),
         1 if p.get("CommunityBanned") else 0,
         1 if p.get("VACBanned") else 0,
         p.get("NumberOfVACBans", 0),
         p.get("DaysSinceLastBan", 0),
         p.get("NumberOfGameBans", 0),
         p.get("EconomyBan", "none"), now_iso]
        for p in players if p.get("SteamId")
    ])
    flagged = [p for p in players if p.get("VACBanned") or p.get("NumberOfGameBans") or p.get("CommunityBanned")]
    log(f"[bans] batch refreshed: {len(players)} checked, {len(flagged)} flagged")
    return True


def concurrent_top():
    """Record live concurrent players for my top-5 recently played games."""
    rows = execute(
        """SELECT appid FROM recent_sessions
           WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions)
             AND playtime_2weeks > 0
           ORDER BY playtime_2weeks DESC LIMIT 5"""
    )
    if not rows:
        rows = execute("SELECT appid FROM owned_games ORDER BY playtime_forever DESC LIMIT 5")
    ts = int(time.time())
    for r in rows:
        appid = r["appid"]
        d = steam_get("/ISteamUserStats/GetNumberOfCurrentPlayers/v1/", {"appid": appid}, timeout=15)
        if d is not None:
            count = (d.get("response", {}) or {}).get("player_count")
            if count is not None:
                execute(SQL_CONCURRENT_INSERT, [appid, ts, count])
    return True


def sweep_tick():
    """Round-robin library sweep: FRIEND_SWEEP_PER_TICK friends per tick.

    A full rotation of 39 friends takes ~20 min at the default pace; steady
    state costs 2 Steam calls/min (same as one extra presence poll).
    """
    global SWEEPS_DONE
    if not STATE["friend_ids"]:
        return
    ids = STATE["friend_ids"]
    n = len(ids)
    done = 0
    for _ in range(FRIEND_SWEEP_PER_TICK):
        steamid = ids[STATE["sweep_cursor"] % n]
        STATE["sweep_cursor"] += 1
        if STATE["sweep_cursor"] % n == 0:
            STATE["sweep_cycles"] += 1
            log(f"[sweep] full rotation #{STATE['sweep_cycles']} complete ({n} friends)")
        if sweep_friend(steamid):
            done += 1
            SWEEPS_DONE += 1
        else:
            log(f"[sweep] transient failure for {steamid} (will retry next tick)")
        if done and STATE["sweep_cursor"] % n == 0:
            bans_batch()  # one batched call per full rotation


def maybe_prune():
    """Once per day (04:00+ window) drop raw poll rows beyond retention."""
    now = datetime.now(TZ)
    today = now.strftime("%Y-%m-%d")
    if STATE["last_prune_day"] == today or now.hour < 4:
        return
    cutoff_self = (now - timedelta(days=RETENTION_SELF_DAYS)).isoformat()
    cutoff_friend = (now - timedelta(days=RETENTION_FRIEND_DAYS)).isoformat()
    execute("DELETE FROM status_polls WHERE timestamp < ?", [cutoff_self])
    execute("DELETE FROM friend_status_polls WHERE timestamp < ?", [cutoff_friend])
    STATE["last_prune_day"] = today
    log(f"[prune] done: status_polls < {RETENTION_SELF_DAYS}d, friend_status_polls < {RETENTION_FRIEND_DAYS}d")


def write_status_file(extra):
    try:
        payload = {
            "updated_at": datetime.now(TZ).isoformat(),
            "uptime_seconds": int(time.time() - START_TS),
            "ticks": TICKS,
            "errors": ERRORS,
            "steam_calls_total": STEAM_CALLS,
            "friend_polls": FRIEND_POLLS,
            "playtime_polls": PLAYTIME_POLLS,
            "friends_known": len(STATE["friend_ids"]),
            "db": DB_PATH,
        }
        payload.update(extra)
        tmp = STATUS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(tmp, STATUS_FILE)
    except OSError as exc:
        log(f"[status] cannot write status file: {exc}")


def tick():
    global TICKS, ERRORS, FRIEND_POLLS
    friend_due = time.time() >= STATE["next_friend"]

    self_p = None
    if friend_due:
        players = poll_friends_and_self()
        if players is not None:
            self_p = players
            STATE["next_friend"] = time.time() + FRIEND_INTERVAL
            FRIEND_POLLS += 1
        else:
            ERRORS += 1
            log("[friends] failed -> standalone self poll fallback")
    if self_p is None:
        self_p = poll_self()
        if self_p is None:
            ERRORS += 1

    if time.time() >= STATE["next_friendlist"]:
        if refresh_friendlist():
            STATE["next_friendlist"] = time.time() + FRIENDLIST_INTERVAL
        else:
            ERRORS += 1

    if time.time() >= STATE["next_playtime"]:
        if sync_playtime():
            STATE["next_playtime"] = time.time() + PLAYTIME_INTERVAL
        else:
            ERRORS += 1

    if time.time() >= STATE["next_concurrent"]:
        if concurrent_top():
            STATE["next_concurrent"] = time.time() + 1800  # every 30 min
        else:
            ERRORS += 1

    sweep_tick()

    maybe_prune()

    # state change -> poke the dashboard builder for an immediate rebuild
    changed = False
    if self_p:
        current = {
            "online": self_p.get("personastate", 0) != 0,
            "game": self_p.get("gameextrainfo", "") or self_p.get("gameid", ""),
        }
        changed = current != STATE.get("last_self") and STATE["last_self"] != {}
        if changed:
            log(f"[self] state changed: {STATE.get('last_self')} -> {current} -> trigger rebuild")
            try:
                os.makedirs(os.path.dirname(TRIGGER_FILE), exist_ok=True)
                with open(TRIGGER_FILE, "w", encoding="utf-8") as f:
                    f.write(datetime.now(TZ).isoformat())
            except OSError:
                pass
        STATE["last_self"] = current

    TICKS += 1
    write_status_file({
        "online": STATE.get("last_self", {}).get("online"),
        "game": STATE.get("last_self", {}).get("game", ""),
        "friend_due_in": max(0, int(STATE["next_friend"] - time.time())),
        "playtime_due_in": max(0, int(STATE["next_playtime"] - time.time())),
        "sweeps_done": SWEEPS_DONE,
        "sweep_cycles": STATE["sweep_cycles"],
    })
    if TICKS % 10 == 0 or changed or TICKS == 1:
        minutes = max(1e-9, (time.time() - START_TS) / 60)
        log(f"[tick {TICKS}] online={STATE.get('last_self', {}).get('online')} "
            f"game='{STATE.get('last_self', {}).get('game', '')}' "
            f"friends={len(STATE['friend_ids'])} calls={STEAM_CALLS} "
            f"({STEAM_CALLS / minutes:.2f}/min) sweeps={SWEEPS_DONE} errors={ERRORS}")


RUNNING = True


def main():
    global KEY, SID, FRIEND_INTERVAL, FRIENDLIST_INTERVAL, PLAYTIME_INTERVAL
    global RETENTION_SELF_DAYS, RETENTION_FRIEND_DAYS, STATUS_FILE, TRIGGER_FILE, SESSION
    global TICKS, ERRORS, FRIEND_POLLS, PLAYTIME_POLLS, PROXY, FRIEND_SWEEP_PER_TICK, SWEEPS_DONE

    load_env()
    KEY = os.getenv("STEAM_API_KEY", "")
    SID = os.getenv("STEAM_ID", "")
    PROXY = os.getenv("FALLBACK_PROXY", "http://192.168.0.103:7897")
    POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "60"))
    FRIEND_SWEEP_PER_TICK = int(os.getenv("FRIEND_SWEEP_PER_TICK", "2"))
    FRIEND_INTERVAL = int(os.getenv("FRIEND_INTERVAL", "300"))
    FRIENDLIST_INTERVAL = int(os.getenv("FRIENDLIST_INTERVAL", "1800"))
    PLAYTIME_INTERVAL = int(os.getenv("PLAYTIME_INTERVAL", "300"))
    RETENTION_SELF_DAYS = int(os.getenv("RETENTION_SELF_DAYS", "45"))
    RETENTION_FRIEND_DAYS = int(os.getenv("RETENTION_FRIEND_DAYS", "30"))
    STATUS_FILE = os.getenv("STATUS_FILE", "/root/steam-notes/data/collector-status.json")
    TRIGGER_FILE = os.getenv("TRIGGER_FILE", "/root/steam-notes/data/trigger-rebuild")

    if not KEY or not SID:
        log("FATAL: STEAM_API_KEY / STEAM_ID missing (check .env next to script)")
        sys.exit(2)

    init_db()
    SESSION = requests.Session()

    log(f"=== steam-collector starting | sid={SID} | db={DB_PATH} | "
        f"poll={POLL_INTERVAL}s friend={FRIEND_INTERVAL}s playtime={PLAYTIME_INTERVAL}s ===")

    # schema: friend tables always ensured; core tables must exist via migration
    for stmt in FRIEND_SCHEMA:
        execute(stmt)
    for stmt in SOCIAL_SCHEMA:
        execute(stmt)
    try:
        execute("ALTER TABLE friends_current ADD COLUMN loccountrycode TEXT")
    except Exception:
        pass  # column already exists
    have = execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN "
        "('status_polls','owned_games','daily_snapshots','recent_sessions','player_daily')"
    )
    have_names = {r["name"] for r in have}
    missing = [t for t in CORE_TABLES if t not in have_names]
    if missing:
        log(f"WARN: core tables missing ({', '.join(missing)}) — run migrate_turso_to_sqlite.py first!")

    # warm start: roster + playtime baseline from DB so first tick is cheap
    try:
        rows = execute("SELECT steamid FROM steam_friends")
        STATE["friend_ids"] = [r["steamid"] for r in rows]
        pt_rows = execute("SELECT appid, playtime_forever FROM owned_games")
        STATE["pt_map"] = {r["appid"]: r["playtime_forever"] or 0 for r in pt_rows}
        today = datetime.now(TZ).strftime("%Y-%m-%d")
        prev_rows = execute(
            """SELECT appid, playtime_forever FROM daily_snapshots
               WHERE date = (SELECT MAX(date) FROM daily_snapshots WHERE date < ?)""",
            [today],
        )
        STATE["prev_map"] = {r["appid"]: r["playtime_forever"] or 0 for r in prev_rows}
        STATE["last_full_day"] = today  # avoid a wasteful full upsert right at startup
        log(f"[init] warm start: {len(STATE['friend_ids'])} friends, {len(STATE['pt_map'])} owned games")
    except Exception as exc:
        log(f"[init] warm start partial failure (will self-heal): {exc}")
        STATE["last_full_day"] = ""  # force full sync on first playtime tick

    while RUNNING:
        t0 = time.time()
        try:
            tick()
        except Exception:
            ERRORS += 1
            log("[tick] UNEXPECTED ERROR:\n" + traceback.format_exc())
        elapsed = time.time() - t0
        sleep_for = max(2, POLL_INTERVAL - elapsed)
        end = time.time() + sleep_for
        while RUNNING and time.time() < end:
            time.sleep(min(1, max(0.1, end - time.time())))
    log("=== steam-collector stopped ===")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
