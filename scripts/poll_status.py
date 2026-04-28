"""
Poll Steam status & generate comprehensive dashboard.json.
All 30 visualizations' data is pre-computed here.
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
from scripts.turso_db import execute

load_dotenv()

TZ = timezone(timedelta(hours=8))  # UTC+8

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DASHBOARD_PATH = os.path.join(DATA_DIR, "dashboard.json")


def get_player_summary():
    url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
    resp = requests.get(url, params={"key": KEY, "steamids": SID, "format": "json"}, timeout=15)
    resp.raise_for_status()
    players = resp.json()["response"].get("players", [])
    return players[0] if players else {}


def poll_status():
    p = get_player_summary()
    now = datetime.now(TZ).isoformat()
    execute(
        "INSERT OR IGNORE INTO status_polls (timestamp, personastate, gameextrainfo, gameid) VALUES (?, ?, ?, ?)",
        [now, p.get("personastate", 0), p.get("gameextrainfo", ""), p.get("gameid", "")],
    )
    online = p.get("personastate", 0) != 0
    print(f"[{now}] Online: {online} | Playing: {p.get('gameextrainfo', 'None')}")
    return p


def build_player(player_info):
    level_rows = execute("SELECT level FROM steam_level ORDER BY date DESC LIMIT 1")
    level = level_rows[0]["level"] if level_rows else 0
    return {
        "personaname": player_info.get("personaname", ""),
        "online": player_info.get("personastate", 0) != 0,
        "currently_playing": player_info.get("gameextrainfo", ""),
        "level": level,
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
    heatmap = {}
    snapshots = execute("SELECT date, name, daily_playtime FROM daily_snapshots WHERE daily_playtime > 0 ORDER BY date DESC")
    for s in snapshots:
        d = s["date"]
        if d not in heatmap:
            heatmap[d] = {"online_minutes": 0, "games": {}}
        heatmap[d]["games"][s["name"]] = s["daily_playtime"]
        heatmap[d]["online_minutes"] += s["daily_playtime"]
    poll_days = execute("SELECT substr(timestamp, 1, 10) as day, COUNT(CASE WHEN personastate > 0 THEN 1 END) * 5 as est FROM status_polls GROUP BY day")
    for p in poll_days:
        if p["day"] not in heatmap:
            heatmap[p["day"]] = {"online_minutes": p["est"], "games": {}}
    return heatmap


def build_time_heatmap():
    """Hour-of-day x day-of-week heatmap from status_polls."""
    rows = execute("SELECT timestamp, personastate FROM status_polls WHERE personastate > 0")
    grid = defaultdict(int)
    for r in rows:
        ts = r["timestamp"]
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        # Convert to local timezone (UTC+8)
        dt = dt.astimezone(TZ)
        grid[(dt.weekday(), dt.hour)] += 1
    return [{"dow": k[0], "hour": k[1], "count": v} for k, v in grid.items()]


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
        games = set()
        for d in week_dates:
            for g in by_date[d]:
                games.add(g["name"])
        weeks.append({"dates": week_dates, "total_hours": round(total / 60, 1), "games_count": len(games), "top_games": list(games)[:5]})
    return weeks


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
    }
    with open(DASHBOARD_PATH, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)
    print(f"Dashboard written ({len(json.dumps(dashboard))} bytes)")
    return dashboard


def main():
    print("=== Steam Status Poll ===\n")
    player = poll_status()
    print("\nGenerating dashboard...")
    db = generate_dashboard(player)
    print(f"  Games: {len(db['game_cloud'])} | Genres: {len(db['genres'])}")
    print(f"  Achievements: {len(db['achievements'])} games")
    print(f"  Weather: {db['game_weather']['forecast']} — {db['game_weather']['top_game']}")
    print("\n=== Done ===")


if __name__ == "__main__":
    main()
