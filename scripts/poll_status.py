"""
Poll Steam status into Turso.

Dashboard generation lives in scripts/build_dashboard.py.
"""
import os
import json
import math
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict

import requests
from dotenv import load_dotenv

sys.path.insert(0, ".")
from scripts.turso_db import execute, execute_many

load_dotenv()

TZ = timezone(timedelta(hours=8))  # UTC+8
STATUS_GAP_CAP = timedelta(minutes=15)
SOCIAL_WINDOW = timedelta(hours=6)

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DASHBOARD_PATH = os.path.join(DATA_DIR, "dashboard.json")
STEAM_USER_API = "https://api.steampowered.com/ISteamUser"
STEAM_SUMMARY_CHUNK_SIZE = 100

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


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def ensure_friend_schema():
    for stmt in FRIEND_SCHEMA:
        execute(stmt)


def get_player_summary():
    url = f"{STEAM_USER_API}/GetPlayerSummaries/v0002/"
    resp = requests.get(url, params={"key": KEY, "steamids": SID, "format": "json"}, timeout=15)
    resp.raise_for_status()
    players = resp.json()["response"].get("players", [])
    return players[0] if players else {}


def describe_request_error(exc):
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else "unknown"
        return f"HTTP {status}"
    return str(exc)


def get_cached_player_summary():
    """Best-effort fallback for dashboard builds when Steam rejects a request."""
    try:
        rows = execute(
            """SELECT personaname, personastate, gameextrainfo, gameid, lastlogoff, loccountrycode
               FROM player_daily
               ORDER BY date DESC LIMIT 1"""
        )
    except Exception:
        rows = []

    if rows:
        row = rows[0]
        return {
            "personaname": row.get("personaname", ""),
            "personastate": row.get("personastate", 0),
            "gameextrainfo": row.get("gameextrainfo", ""),
            "gameid": row.get("gameid", ""),
            "lastlogoff": row.get("lastlogoff", 0),
            "loccountrycode": row.get("loccountrycode", ""),
        }

    try:
        with open(DASHBOARD_PATH, "r", encoding="utf-8") as f:
            player = json.load(f).get("player", {})
    except Exception:
        return {}

    return {
        "personaname": player.get("personaname", ""),
        "personastate": 1 if player.get("online") else 0,
        "gameextrainfo": player.get("currently_playing", ""),
        "gameid": "",
        "avatarfull": player.get("avatarfull", ""),
    }


def get_player_summary_or_none():
    try:
        return get_player_summary()
    except (requests.RequestException, KeyError, ValueError) as exc:
        print(f"Player summary fetch skipped: {describe_request_error(exc)}")
        return None


def get_player_summary_for_dashboard():
    player = get_player_summary_or_none()
    if player is not None:
        return player
    cached = get_cached_player_summary()
    if cached:
        print("Using cached player summary for dashboard generation")
    else:
        print("No cached player summary available; dashboard will use empty player data")
    return cached


def get_friend_list():
    url = f"{STEAM_USER_API}/GetFriendList/v0001/"
    resp = requests.get(
        url,
        params={"key": KEY, "steamid": SID, "relationship": "friend", "format": "json"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("friendslist", {}).get("friends", [])


def get_player_summaries(steamids):
    players = []
    url = f"{STEAM_USER_API}/GetPlayerSummaries/v0002/"
    for batch in chunks(steamids, STEAM_SUMMARY_CHUNK_SIZE):
        resp = requests.get(
            url,
            params={"key": KEY, "steamids": ",".join(batch), "format": "json"},
            timeout=20,
        )
        resp.raise_for_status()
        players.extend(resp.json().get("response", {}).get("players", []))
    return players


def poll_status():
    p = get_player_summary_or_none()
    if not p:
        print("Status poll skipped: no player summary available")
        return {}

    now = datetime.now(TZ).isoformat()
    execute(
        "INSERT OR IGNORE INTO status_polls (timestamp, personastate, gameextrainfo, gameid) VALUES (?, ?, ?, ?)",
        [now, p.get("personastate", 0), p.get("gameextrainfo", ""), p.get("gameid", "")],
    )
    online = p.get("personastate", 0) != 0
    print(f"[{now}] Online: {online} | Playing: {p.get('gameextrainfo', 'None')}")
    return p


def poll_friend_statuses():
    """Record Steam friends' visible realtime presence and current games."""
    ensure_friend_schema()
    now = datetime.now(TZ).isoformat()

    try:
        friends = get_friend_list()
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        print(f"Friend poll skipped: GetFriendList failed with HTTP {status}")
        return []
    except requests.RequestException as exc:
        print(f"Friend poll skipped: GetFriendList request failed: {exc}")
        return []

    if not friends:
        print("Friend poll skipped: no friends returned")
        return []

    friend_args = [
        [
            f["steamid"],
            f.get("relationship", "friend"),
            f.get("friend_since", 0),
            now,
        ]
        for f in friends
    ]
    execute_many(
        """INSERT INTO steam_friends (steamid, relationship, friend_since, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(steamid) DO UPDATE SET
             relationship=excluded.relationship,
             friend_since=excluded.friend_since,
             updated_at=excluded.updated_at""",
        friend_args,
    )

    steamids = [f["steamid"] for f in friends]
    try:
        players = get_player_summaries(steamids)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        print(f"Friend poll skipped: GetPlayerSummaries failed with HTTP {status}")
        return []
    except requests.RequestException as exc:
        print(f"Friend poll skipped: GetPlayerSummaries request failed: {exc}")
        return []

    if not players:
        print("Friend poll skipped: no friend summaries returned")
        return []

    profile_args = [
        [
            p.get("steamid", ""),
            p.get("personaname", ""),
            p.get("avatarfull", ""),
            p.get("profileurl", ""),
            now,
            now,
        ]
        for p in players
        if p.get("steamid")
    ]
    if profile_args:
        execute_many(
            """INSERT INTO steam_friends (steamid, personaname, avatarfull, profileurl, last_seen_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(steamid) DO UPDATE SET
                 personaname=excluded.personaname,
                 avatarfull=excluded.avatarfull,
                 profileurl=excluded.profileurl,
                 last_seen_at=excluded.last_seen_at,
                 updated_at=excluded.updated_at""",
            profile_args,
        )

    poll_args = [
        [
            now,
            p.get("steamid", ""),
            p.get("personaname", ""),
            p.get("personastate", 0),
            p.get("gameextrainfo", ""),
            p.get("gameid", ""),
            p.get("lastlogoff", 0),
            p.get("avatarfull", ""),
            p.get("profileurl", ""),
        ]
        for p in players
        if p.get("steamid")
    ]
    if poll_args:
        execute_many(
            """INSERT OR IGNORE INTO friend_status_polls
               (timestamp, steamid, personaname, personastate, gameextrainfo, gameid, lastlogoff, avatarfull, profileurl)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            poll_args,
        )

    playing = [p for p in players if p.get("gameid") or p.get("gameextrainfo")]
    print(f"[{now}] Friends polled: {len(players)} visible | Playing now: {len(playing)}")
    for p in playing[:10]:
        print(f"  - {p.get('personaname', p.get('steamid'))}: {p.get('gameextrainfo') or p.get('gameid')}")
    if len(playing) > 10:
        print(f"  ... and {len(playing) - 10} more")

    return players


def build_player(player_info):
    level_rows = execute("SELECT level FROM steam_level ORDER BY date DESC LIMIT 1")
    level = level_rows[0]["level"] if level_rows else 0
    return {
        "personaname": player_info.get("personaname", ""),
        "online": player_info.get("personastate", 0) != 0,
        "currently_playing": player_info.get("gameextrainfo", ""),
        "level": level,
        "avatarfull": player_info.get("avatarfull", ""),
    }


def build_milestone():
    rows = execute("SELECT SUM(playtime_forever) as total FROM owned_games")
    total_min = rows[0]["total"] if rows and rows[0]["total"] else 0
    total_h = round(total_min / 60, 1)
    movies = int(total_h / 2)
    books = int(total_h / 6)
    walking_km = int(total_h * 5)
    return {"total_hours": total_h, "movies": movies, "books": books, "walking_km": walking_km}


def build_game_cloud():
    rows = execute(
        """SELECT og.appid, og.name, og.playtime_forever, og.img_icon_url,
                  og.rtime_last_played, gd.genres
           FROM owned_games og
           LEFT JOIN game_details gd ON og.appid = gd.appid
           WHERE og.playtime_forever > 0
           ORDER BY og.playtime_forever DESC"""
    )
    return [
        {
            "appid": r["appid"], "name": r["name"],
            "playtime_hours": round(r["playtime_forever"] / 60, 1),
            "img_icon_url": r["img_icon_url"],
            "rtime_last_played": r["rtime_last_played"],
            "genres": json.loads(r["genres"]) if r["genres"] else [],
        } for r in rows
    ]


def build_recent_activity():
    rows = execute(
        """SELECT appid, name, playtime_2weeks, playtime_forever FROM recent_sessions
           WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions) ORDER BY playtime_2weeks DESC"""
    )
    return [
        {"appid": r["appid"], "name": r["name"],
         "playtime_2weeks_hours": round(r["playtime_2weeks"] / 60, 1),
         "playtime_forever_hours": round(r["playtime_forever"] / 60, 1)}
        for r in rows
    ]


def build_heatmap():
    """Build daily playtime heatmap from Steam playtime deltas."""
    heatmap = {}
    snapshots = execute("SELECT date, name, daily_playtime FROM daily_snapshots WHERE daily_playtime > 0 ORDER BY date DESC")
    for s in snapshots:
        d = s["date"]
        if d not in heatmap:
            heatmap[d] = {"playtime_minutes": 0, "online_minutes": 0, "games": {}}
        heatmap[d]["games"][s["name"]] = s["daily_playtime"]
        heatmap[d]["playtime_minutes"] += s["daily_playtime"]
        # Backward-compatible alias for the current frontend/static JSON.
        # This value is Steam playtime, not persona-online duration.
        heatmap[d]["online_minutes"] = heatmap[d]["playtime_minutes"]
    return heatmap


def build_time_heatmap():
    """Build this week's in-game activity by weekday/hour from status intervals.

    Each poll state is treated as lasting until the next poll, capped to avoid
    counting long downtime gaps as activity. Steam-online-but-not-playing time
    is deliberately ignored so the distribution reflects playtime only.
    """
    now = datetime.now(TZ)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = execute(
        """SELECT timestamp, personastate, gameextrainfo, gameid
           FROM status_polls
           ORDER BY timestamp ASC"""
    )
    recent_cutoff = now - timedelta(hours=24)
    grid = defaultdict(lambda: {
        "count": 0.0,
        "recent_count": 0.0,
        "all_time_count": 0.0,
        "game_minutes": 0.0,
        "online_minutes": 0.0,
        "games": defaultdict(float),
    })

    def parse_ts(ts):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TZ)
        return dt.astimezone(TZ)

    def game_name_from_row(row):
        is_playing = bool(row.get("gameid")) or bool(row.get("gameextrainfo"))
        if not is_playing:
            return ""
        return row.get("gameextrainfo") or f"App {row.get('gameid')}" or "Unknown game"

    def add_interval(start, end, game_name, *, all_time=False):
        if all_time:
            cursor = start
        else:
            cursor = max(start, week_start)
        while cursor < end:
            next_hour = (cursor.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
            segment_end = min(end, next_hour)
            minutes = (segment_end - cursor).total_seconds() / 60
            if minutes > 0:
                key = (cursor.weekday(), cursor.hour)
                if all_time:
                    grid[key]["all_time_count"] += minutes
                else:
                    grid[key]["count"] += minutes
                    grid[key]["game_minutes"] += minutes
                    grid[key]["games"][game_name] += minutes
                    if segment_end > recent_cutoff:
                        recent_start = max(cursor, recent_cutoff)
                        recent_minutes = (segment_end - recent_start).total_seconds() / 60
                        if recent_minutes > 0:
                            grid[key]["recent_count"] += recent_minutes
            cursor = segment_end

    for i, r in enumerate(rows):
        game_name = game_name_from_row(r)
        if not game_name:
            continue
        ts = r["timestamp"]
        start = parse_ts(ts)
        next_start = parse_ts(rows[i + 1]["timestamp"]) if i + 1 < len(rows) else now
        end = min(next_start, start + STATUS_GAP_CAP, now)
        if end <= start:
            continue
        add_interval(start, end, game_name, all_time=True)
        if end > week_start:
            add_interval(start, end, game_name)

    return [
        {
            "dow": k[0],
            "hour": k[1],
            "count": round(v["count"], 1),
            "recent_count": round(v["recent_count"], 1),
            "all_time_count": round(v["all_time_count"], 1),
            "game_minutes": round(v["game_minutes"], 1),
            "online_minutes": round(v["online_minutes"], 1),
            "games": {
                name: round(minutes, 1)
                for name, minutes in sorted(v["games"].items(), key=lambda item: item[1], reverse=True)
                if minutes > 0
            },
        }
        for k, v in grid.items()
    ]


def build_platform_breakdown():
    rows = execute("SELECT SUM(playtime_windows_forever) as win, SUM(playtime_mac_forever) as mac, SUM(playtime_linux_forever) as lin, SUM(playtime_deck_forever) as deck FROM owned_games")
    r = rows[0]
    return {
        "Windows": round((r["win"] or 0) / 60, 1),
        "Mac": round((r["mac"] or 0) / 60, 1),
        "Linux": round((r["lin"] or 0) / 60, 1),
        "Steam Deck": round((r["deck"] or 0) / 60, 1),
    }


def build_pareto():
    rows = execute("SELECT name, playtime_forever FROM owned_games WHERE playtime_forever > 0 ORDER BY playtime_forever DESC")
    total = sum(r["playtime_forever"] for r in rows)
    cumulative = 0
    data = []
    for i, r in enumerate(rows):
        cumulative += r["playtime_forever"]
        data.append({"name": r["name"], "hours": round(r["playtime_forever"] / 60, 1),
                      "cumulative_pct": round(cumulative / total * 100, 1), "rank": i + 1})
    return data


def build_weekday_preference():
    rows = execute("SELECT date, SUM(daily_playtime) as total FROM daily_snapshots WHERE daily_playtime > 0 GROUP BY date")
    days = [0] * 7
    for r in rows:
        dt = datetime.strptime(r["date"], "%Y-%m-%d")
        days[dt.weekday()] += r["total"]
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return [{"day": labels[i], "minutes": days[i]} for i in range(7)]


def build_stats():
    rows = execute("SELECT COUNT(*) as total FROM owned_games")
    total_games = rows[0]["total"]
    played = execute("SELECT COUNT(*) as cnt FROM owned_games WHERE playtime_forever > 0")
    played_count = played[0]["cnt"]
    dust_rate = round((total_games - played_count) / total_games * 100, 1) if total_games else 0

    # Loyalty: Shannon diversity index
    pt_rows = execute("SELECT playtime_forever FROM owned_games WHERE playtime_forever > 0")
    total_pt = sum(r["playtime_forever"] for r in pt_rows)
    shannon = 0
    for r in pt_rows:
        p = r["playtime_forever"] / total_pt
        if p > 0:
            shannon -= p * math.log(p)
    max_shannon = math.log(len(pt_rows)) if len(pt_rows) > 1 else 1
    loyalty_score = round((1 - shannon / max_shannon) * 100) if max_shannon > 0 else 0
    loyalty_label = "Specialist" if loyalty_score > 70 else "Balanced" if loyalty_score > 40 else "Explorer"

    # Peak day
    peak = execute("SELECT date, SUM(daily_playtime) as total FROM daily_snapshots GROUP BY date ORDER BY total DESC LIMIT 1")
    peak_day = {"date": peak[0]["date"], "minutes": peak[0]["total"]} if peak else None

    # Streak
    dates = execute("SELECT DISTINCT date FROM daily_snapshots WHERE daily_playtime > 0 ORDER BY date")
    streak = longest_streak([d["date"] for d in dates])

    return {
        "total_games": total_games,
        "played_games": played_count,
        "dust_rate": dust_rate,
        "never_played": total_games - played_count,
        "loyalty_score": loyalty_score,
        "loyalty_label": loyalty_label,
        "peak_day": peak_day,
        "longest_streak": streak,
    }


def longest_streak(dates):
    if not dates:
        return {"days": 0, "start": None, "end": None}
    best = cur = 1
    best_s = best_e = cur_s = dates[0]
    for i in range(1, len(dates)):
        prev = datetime.strptime(dates[i - 1], "%Y-%m-%d")
        curr = datetime.strptime(dates[i], "%Y-%m-%d")
        if (curr - prev).days == 1:
            cur += 1
            if cur > best:
                best = cur
                best_s = cur_s
                best_e = dates[i]
        else:
            cur = 1
            cur_s = dates[i]
    return {"days": best, "start": best_s, "end": best_e}


def build_achievements():
    games = execute(
        """SELECT og.appid, og.name, og.playtime_forever,
           (SELECT COUNT(*) FROM game_achievements ga WHERE ga.appid = og.appid) as total,
           (SELECT COUNT(*) FROM game_achievements ga WHERE ga.appid = og.appid AND ga.achieved = 1) as unlocked
           FROM owned_games og
           WHERE og.playtime_forever > 0 AND EXISTS (SELECT 1 FROM game_achievements ga WHERE ga.appid = og.appid)
           ORDER BY og.playtime_forever DESC LIMIT 20"""
    )
    result = []
    for g in games:
        total = g["total"]
        unlocked = g["unlocked"]
        pct = round(unlocked / total * 100) if total else 0
        # Rare achievements (unlocked by player, low global %)
        rare = execute(
            """SELECT apiname, global_percent FROM game_achievements
               WHERE appid = ? AND achieved = 1 AND global_percent != '0'
               ORDER BY CAST(global_percent AS REAL) ASC LIMIT 5""",
            [g["appid"]],
        )
        result.append({
            "appid": g["appid"], "name": g["name"],
            "playtime_hours": round(g["playtime_forever"] / 60, 1),
            "total": total, "unlocked": unlocked, "pct": pct,
            "rare": [{"name": r["apiname"], "global_pct": float(r["global_percent"])} for r in rare],
        })
    return result


def build_game_network():
    """Games that were played in the same 2-week period are 'related'."""
    rows = execute(
        """SELECT a.appid as id_a, a.name as game_a,
                  b.appid as id_b, b.name as game_b, COUNT(*) as strength
           FROM recent_sessions a JOIN recent_sessions b ON a.snapshot_date = b.snapshot_date AND a.appid < b.appid
           GROUP BY a.appid, b.appid ORDER BY strength DESC LIMIT 30"""
    )
    # Fetch genres for all involved games
    appids = set()
    for r in rows:
        appids.add(r["id_a"])
        appids.add(r["id_b"])
    genre_map = {}
    if appids:
        placeholders = ",".join(["?"] * len(appids))
        detail_rows = execute(
            f"SELECT appid, genres FROM game_details WHERE appid IN ({placeholders})",
            list(appids),
        )
        for dr in detail_rows:
            genre_map[dr["appid"]] = json.loads(dr["genres"]) if dr["genres"] else []

    nodes = {}
    links = []
    for r in rows:
        nodes[r["id_a"]] = {"appid": r["id_a"], "name": r["game_a"], "genres": genre_map.get(r["id_a"], [])}
        nodes[r["id_b"]] = {"appid": r["id_b"], "name": r["game_b"], "genres": genre_map.get(r["id_b"], [])}
        links.append({"source": r["id_a"], "target": r["id_b"], "strength": r["strength"]})
    return {"nodes": list(nodes.values()), "links": links}


def build_genre_distribution():
    rows = execute("SELECT genres FROM game_details WHERE genres != '[]'")
    genre_count = defaultdict(int)
    genre_hours = defaultdict(float)
    for r in rows:
        genres = json.loads(r["genres"])
        for g in genres:
            genre_count[g] += 1
    # Get hours per genre
    detail_rows = execute(
        """SELECT gd.genres, og.playtime_forever FROM game_details gd
           JOIN owned_games og ON gd.appid = og.appid WHERE og.playtime_forever > 0"""
    )
    for r in detail_rows:
        genres = json.loads(r["genres"])
        for g in genres:
            genre_hours[g] += r["playtime_forever"] / 60
    return [{"genre": g, "games": genre_count[g], "hours": round(genre_hours[g], 1)}
            for g in sorted(genre_hours, key=genre_hours.get, reverse=True)]


def build_game_weather():
    rows = execute(
        """SELECT name, playtime_2weeks FROM recent_sessions
           WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM recent_sessions)
           ORDER BY playtime_2weeks DESC LIMIT 5"""
    )
    if not rows:
        return {"forecast": "Clear skies", "games": []}
    top = rows[0]
    intensity = "storm" if top["playtime_2weeks"] > 1200 else "rain" if top["playtime_2weeks"] > 600 else "cloudy" if top["playtime_2weeks"] > 120 else "sunny"
    return {
        "forecast": intensity,
        "top_game": top["name"],
        "games": [{"name": r["name"], "hours": round(r["playtime_2weeks"] / 60, 1)} for r in rows],
    }


def build_weekly_digest():
    """Pre-compute a weekly summary."""
    rows = execute(
        """SELECT date, name, daily_playtime FROM daily_snapshots
           WHERE daily_playtime > 0 ORDER BY date DESC LIMIT 50"""
    )
    by_date = defaultdict(list)
    for r in rows:
        by_date[r["date"]].append({"name": r["name"], "minutes": r["daily_playtime"]})
    weeks = []
    dates_sorted = sorted(by_date.keys(), reverse=True)
    for i in range(0, min(len(dates_sorted), 7), 7):
        week_dates = dates_sorted[i:i + 7]
        total = sum(sum(g["minutes"] for g in by_date[d]) for d in week_dates)
        games = defaultdict(int)
        for d in week_dates:
            for g in by_date[d]:
                games[g["name"]] += g["minutes"]
        top_games = sorted(games, key=games.get, reverse=True)[:5]
        weeks.append({"dates": week_dates, "total_hours": round(total / 60, 1), "games_count": len(games), "top_games": top_games})
    return weeks


def build_game_updates():
    try:
        rows = execute(
            """SELECT appid, game_name, title, url, date, feedname, feedlabel, update_type, contents
               FROM game_news_updates
               WHERE date >= ?
               ORDER BY date DESC
               LIMIT 24""",
            [int((datetime.now(TZ) - timedelta(days=14)).timestamp())],
        )
    except Exception:
        return []

    return [
        {
            "appid": r["appid"],
            "game_name": r["game_name"],
            "title": r["title"],
            "url": r["url"] or "",
            "date": r["date"],
            "feedname": r["feedname"] or "",
            "feedlabel": r["feedlabel"] or "",
            "update_type": r["update_type"] or "Update",
            "contents": r["contents"] or "",
        }
        for r in rows
    ]


def build_social_presence(player_info):
    """Build a compact recent timeline for the player and visible friends."""
    ensure_friend_schema()
    now = datetime.now(TZ)
    window_start = now - SOCIAL_WINDOW
    cutoff = window_start.isoformat()

    def parse_ts(ts):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TZ)
        return dt.astimezone(TZ)

    def state_from_row(row):
        game_name = row.get("gameextrainfo") or ""
        gameid = row.get("gameid") or ""
        online = (row.get("personastate") or 0) != 0
        return {
            "timestamp": row["timestamp"],
            "online": online,
            "game": game_name,
            "gameid": gameid,
            "playing": online and (bool(game_name) or bool(gameid)),
        }

    def segments_from_events(events):
        segments = []
        if not events:
            return segments
        ordered = sorted(events, key=lambda item: item["timestamp"])
        for index, event in enumerate(ordered):
            if not event["playing"]:
                continue
            start = max(parse_ts(event["timestamp"]), window_start)
            next_start = parse_ts(ordered[index + 1]["timestamp"]) if index + 1 < len(ordered) else now
            end = min(next_start, start + STATUS_GAP_CAP, now)
            if end <= start:
                continue
            segments.append({
                "start": start.isoformat(),
                "end": end.isoformat(),
                "status": "playing",
                "game": event["game"],
                "gameid": event["gameid"],
            })
        return segments

    try:
        self_rows = execute(
            """SELECT timestamp, personastate, gameextrainfo, gameid
               FROM status_polls
               WHERE timestamp >= ?
               ORDER BY timestamp ASC""",
            [cutoff],
        )
        friend_rows = execute(
            """SELECT timestamp, steamid, personaname, personastate, gameextrainfo, gameid, avatarfull, profileurl
               FROM friend_status_polls
               WHERE timestamp >= ?
               ORDER BY timestamp ASC""",
            [cutoff],
        )
        friend_profiles = execute(
            """SELECT steamid, personaname, avatarfull, profileurl, last_seen_at
               FROM steam_friends
               ORDER BY last_seen_at DESC"""
        )
    except Exception:
        return {
            "window_start": window_start.isoformat(),
            "window_end": now.isoformat(),
            "members": [],
        }

    members = []
    self_events = [state_from_row(r) for r in self_rows]
    if not self_events and player_info:
        self_events = [{
            "timestamp": now.isoformat(),
            "online": player_info.get("personastate", 0) != 0,
            "game": player_info.get("gameextrainfo", ""),
            "gameid": player_info.get("gameid", ""),
            "playing": bool(player_info.get("gameextrainfo") or player_info.get("gameid")),
        }]

    latest_self = self_events[-1] if self_events else {
        "timestamp": now.isoformat(),
        "online": player_info.get("personastate", 0) != 0,
        "game": player_info.get("gameextrainfo", ""),
        "gameid": player_info.get("gameid", ""),
        "playing": bool(player_info.get("gameextrainfo") or player_info.get("gameid")),
    }
    members.append({
        "id": "self",
        "steamid": SID,
        "name": player_info.get("personaname", "You"),
        "avatarfull": player_info.get("avatarfull", ""),
        "profileurl": player_info.get("profileurl", ""),
        "is_self": True,
        "last_seen_at": latest_self["timestamp"],
        "current": latest_self,
        "segments": segments_from_events(self_events),
    })

    profile_map = {p["steamid"]: p for p in friend_profiles}
    grouped = defaultdict(list)
    for row in friend_rows:
        grouped[row["steamid"]].append(state_from_row(row))
        profile_map[row["steamid"]] = {
            **profile_map.get(row["steamid"], {}),
            "steamid": row["steamid"],
            "personaname": row.get("personaname") or profile_map.get(row["steamid"], {}).get("personaname", ""),
            "avatarfull": row.get("avatarfull") or profile_map.get(row["steamid"], {}).get("avatarfull", ""),
            "profileurl": row.get("profileurl") or profile_map.get(row["steamid"], {}).get("profileurl", ""),
        }

    for steamid, profile in profile_map.items():
        events = grouped.get(steamid, [])
        latest = events[-1] if events else {
            "timestamp": profile.get("last_seen_at") or "",
            "online": False,
            "game": "",
            "gameid": "",
            "playing": False,
        }
        members.append({
            "id": steamid,
            "steamid": steamid,
            "name": profile.get("personaname") or steamid,
            "avatarfull": profile.get("avatarfull") or "",
            "profileurl": profile.get("profileurl") or "",
            "is_self": False,
            "last_seen_at": latest["timestamp"] or profile.get("last_seen_at") or "",
            "current": latest,
            "segments": segments_from_events(events),
        })

    def member_rank(member):
        last_seen = member["last_seen_at"]
        try:
            last_seen_score = -parse_ts(last_seen).timestamp() if last_seen else 0
        except ValueError:
            last_seen_score = 0
        return (
            0 if member["is_self"] else 1,
            0 if member["current"]["playing"] else 1,
            0 if member["current"]["online"] else 1,
            last_seen_score,
        )

    members.sort(key=member_rank)

    return {
        "window_start": window_start.isoformat(),
        "window_end": now.isoformat(),
        "members": members,
    }


def generate_dashboard(player_info):
    os.makedirs(DATA_DIR, exist_ok=True)
    dashboard = {
        "updated_at": datetime.now(TZ).isoformat(),
        "player": build_player(player_info),
        "milestone": build_milestone(),
        "game_cloud": build_game_cloud(),
        "recent_activity": build_recent_activity(),
        "heatmap": build_heatmap(),
        "time_heatmap": build_time_heatmap(),
        "platform": build_platform_breakdown(),
        "pareto": build_pareto(),
        "weekday": build_weekday_preference(),
        "stats": build_stats(),
        "achievements": build_achievements(),
        "game_network": build_game_network(),
        "genres": build_genre_distribution(),
        "game_weather": build_game_weather(),
        "weekly_digest": build_weekly_digest(),
        "game_updates": build_game_updates(),
        "social_presence": build_social_presence(player_info),
    }
    os.makedirs(os.path.dirname(DASHBOARD_PATH), exist_ok=True)
    with open(DASHBOARD_PATH, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)
    print(f"Dashboard written ({len(json.dumps(dashboard))} bytes)")
    return dashboard


def main():
    print("=== Steam Status Poll ===\n")
    poll_status()
    poll_friend_statuses()
    print("\n=== Done ===")


if __name__ == "__main__":
    main()
