#!/usr/bin/env python3
"""PC-side fresh data collector — fetches from Steam API via Clash, updates a SQLite copy, rebuilds dashboard."""
import json, os, sqlite3, sys, time
import requests

# config
KEY = "582140B5E4F194473C5172A2CD04B94A"
SID = "76561198367786896"
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "fresh.db")
PROXY = {"http": "http://127.0.0.1:7897", "https": "http://127.0.0.1:7897"}
B = "https://api.steampowered.com"
TZ_H = 8

session = requests.Session()
session.proxies = PROXY

def get(path, params, timeout=25):
    r = session.get(f"{B}{path}", params={"key": KEY, "format": "json", **params}, timeout=timeout)
    r.raise_for_status()
    return r.json()

def now_iso():
    from datetime import datetime, timezone, timedelta
    return datetime.now(timezone(timedelta(hours=8))).isoformat()

def today():
    from datetime import datetime, timezone, timedelta
    return datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")

def main():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    # 1. GetPlayerSummaries (self + all friends batched)
    print("[1/6] friends list...")
    fl = get("/ISteamUser/GetFriendList/v0001/", {"steamid": SID, "relationship": "friend"})
    friends = fl.get("friendslist", {}).get("friends", [])
    friend_ids = [f["steamid"] for f in friends]
    all_ids = [SID] + friend_ids
    print(f"  friends: {len(friend_ids)}")
    
    print("[2/6] summaries (self + friends batch)...")
    summaries = []
    for i in range(0, len(all_ids), 100):
        batch = all_ids[i:i+100]
        d = get("/ISteamUser/GetPlayerSummaries/v0002/", {"steamids": ",".join(batch)})
        summaries.extend(d.get("response", {}).get("players", []))
    print(f"  summaries: {len(summaries)}")
    
    # create tables
    c.execute("""CREATE TABLE IF NOT EXISTS friends_current (
        steamid TEXT PRIMARY KEY, personaname TEXT, personastate INTEGER DEFAULT 0,
        gameextrainfo TEXT, gameid TEXT, lastlogoff INTEGER DEFAULT 0,
        avatarfull TEXT, profileurl TEXT, loccountrycode TEXT, updated_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS steam_friends (
        steamid TEXT PRIMARY KEY, relationship TEXT, friend_since INTEGER DEFAULT 0,
        personaname TEXT, avatarfull TEXT, profileurl TEXT, last_seen_at TEXT, updated_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS status_polls (
        timestamp TEXT NOT NULL, personastate INTEGER DEFAULT 0,
        gameextrainfo TEXT, gameid TEXT, PRIMARY KEY (timestamp))""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_status_polls (
        timestamp TEXT NOT NULL, steamid TEXT NOT NULL, personaname TEXT,
        personastate INTEGER DEFAULT 0, gameextrainfo TEXT, gameid TEXT,
        lastlogoff INTEGER DEFAULT 0, avatarfull TEXT, profileurl TEXT,
        PRIMARY KEY (timestamp, steamid))""")
    c.execute("""CREATE TABLE IF NOT EXISTS owned_games (
        appid INTEGER PRIMARY KEY, name TEXT, playtime_forever INTEGER DEFAULT 0,
        playtime_windows_forever INTEGER DEFAULT 0, playtime_mac_forever INTEGER DEFAULT 0,
        playtime_linux_forever INTEGER DEFAULT 0, playtime_deck_forever INTEGER DEFAULT 0,
        img_icon_url TEXT, rtime_last_played INTEGER DEFAULT 0, updated_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS recent_sessions (
        snapshot_date TEXT, appid INTEGER, name TEXT,
        playtime_2weeks INTEGER DEFAULT 0, playtime_forever INTEGER DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS steam_level (date TEXT PRIMARY KEY, level INTEGER)""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_presence_daily (
        date TEXT NOT NULL, steamid TEXT NOT NULL, minutes INTEGER DEFAULT 0,
        PRIMARY KEY (date, steamid))""")
    c.execute("""CREATE TABLE IF NOT EXISTS my_presence_daily (
        date TEXT PRIMARY KEY, minutes INTEGER DEFAULT 0, playing_minutes INTEGER DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_presence_hourly (
        date TEXT NOT NULL, steamid TEXT NOT NULL, hour INTEGER NOT NULL, minutes INTEGER DEFAULT 0,
        PRIMARY KEY (date, steamid, hour))""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_achievements (
        steamid TEXT NOT NULL, appid INTEGER NOT NULL, achieved INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0, updated_at TEXT, PRIMARY KEY (steamid, appid))""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_bans (
        steamid TEXT PRIMARY KEY, community_banned INTEGER DEFAULT 0, vac_banned INTEGER DEFAULT 0,
        num_vac_bans INTEGER DEFAULT 0, days_since_last_ban INTEGER DEFAULT 0,
        num_game_bans INTEGER DEFAULT 0, economy_ban TEXT, updated_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS friend_levels (
        steamid TEXT PRIMARY KEY, player_level INTEGER DEFAULT 0, player_xp INTEGER DEFAULT 0,
        xp_to_level_up INTEGER DEFAULT 0, badges_count INTEGER DEFAULT 0, status TEXT, updated_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS game_concurrent (
        appid INTEGER NOT NULL, ts INTEGER NOT NULL, player_count INTEGER,
        PRIMARY KEY (appid, ts))""")
    conn.commit()
    
    now = now_iso()
    today = today_str()
    
    # self summary
    me = next((p for p in summaries if p.get("steamid") == SID), summaries[0] if summaries else {})
    
    # 3. upsert summaries into friends_current + steam_friends + status_polls
    print("[3/6] upserting presence...")
    for p in summaries:
        sid = p.get("steamid", "")
        if sid == SID:
            c.execute("INSERT OR REPLACE INTO status_polls VALUES (?,?,?,?)",
                      (now, p.get("personastate", 0), p.get("gameextrainfo", ""), p.get("gameid", "")))
            # my presence daily
            playing = 1 if p.get("gameextrainfo") or p.get("gameid") else 0
            c.execute("INSERT INTO my_presence_daily VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET minutes=minutes+?, playing_minutes=playing_minutes+?",
                      (today, 1, playing, playing))
        else:
            c.execute("""INSERT INTO friends_current VALUES (?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(steamid) DO UPDATE SET personaname=excluded.personaname,
                personastate=excluded.personastate, gameextrainfo=excluded.gameextrainfo,
                gameid=excluded.gameid, lastlogoff=excluded.lastlogoff,
                avatarfull=excluded.avatarfull, profileurl=excluded.profileurl,
                loccountrycode=excluded.loccountrycode, updated_at=excluded.updated_at""",
                (sid, p.get("personaname",""), p.get("personastate",0), p.get("gameextrainfo",""),
                 p.get("gameid",""), p.get("lastlogoff",0), p.get("avatarfull",""),
                 p.get("profileurl",""), p.get("loccountrycode",""), now))
            c.execute("INSERT OR IGNORE INTO friend_presence_daily VALUES (?,?,1)", (today, sid))
            c.execute("INSERT OR IGNORE INTO friend_presence_hourly VALUES (?,?,?,1)", (today, sid, now.hour))
    
    # steam_friends upsert
    for f in friends:
        c.execute("""INSERT INTO steam_friends VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(steamid) DO UPDATE SET updated_at=excluded.updated_at""",
            (f["steamid"], "friend", f.get("friend_since",0), "", "", "", now, now))
    conn.commit()
    
    # 4. owned games (self)
    print("[4/6] owned games...")
    og = get("/IPlayerService/GetOwnedGames/v0001/", {
        "steamid": SID, "include_appinfo": "true", "include_played_free_games": "true"})
    games = og.get("response", {}).get("games", [])
    for g in games:
        c.execute("""INSERT OR REPLACE INTO owned_games VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (g["appid"], g.get("name",""), g.get("playtime_forever",0),
             g.get("playtime_windows_forever",0), g.get("playtime_mac_forever",0),
             g.get("playtime_linux_forever",0), g.get("playtime_deck_forever",0),
             g.get("img_icon_url",""), g.get("rtime_last_played",0), now))
    print(f"  owned: {len(games)}")
    
    # recent sessions
    rg = get("/IPlayerService/GetRecentlyPlayedGames/v0001/", {"steamid": SID})
    rgames = rg.get("response", {}).get("games", [])
    for g in rgames:
        c.execute("INSERT OR REPLACE INTO recent_sessions VALUES (?,?,?,?,?)",
            (today, g["appid"], g.get("name",""), g.get("playtime_2weeks",0), g.get("playtime_forever",0)))
    print(f"  recent: {len(rgames)}")
    
    # steam level
    try:
        sl = get("/IPlayerService/GetSteamLevel/v0001/", {"steamid": SID})
        lvl = sl.get("response", {}).get("player_level", 0)
        if lvl:
            c.execute("INSERT OR REPLACE INTO steam_level VALUES (?,?)", (today, lvl))
            print(f"  level: {lvl}")
    except: pass
    
    # my achievements for top games
    print("[5/6] achievements for top games...")
    ach_count = 0
    top_by_time = sorted(games, key=lambda g: g.get("playtime_forever",0), reverse=True)[:10]
    for g in top_by_time:
        appid = g["appid"]
        try:
            ach = get("/ISteamUserStats/GetPlayerAchievements/v0001/", {"steamid": SID, "appid": appid})
            achs = ach.get("playerstats", {}).get("achievements", [])
            if achs:
                achieved = sum(1 for a in achs if a.get("achieved")==1)
                for a in achs:
                    c.execute("INSERT OR REPLACE INTO game_achievements (appid, apiname, achieved, unlocktime, global_percent) VALUES (?,?,?,?,?)",
                        (appid, a.get("apiname",""), a.get("achieved",0), a.get("unlocktime",0), "0"))
                ach_count += 1
                print(f"  appid {appid}: {achieved}/{len(achs)}")
        except: pass
    
    # game details for top games
    print("[6/6] game details...")
    detail_count = 0
    for g in top_by_time[:10]:
        try:
            gd = session.get(f"https://store.steampowered.com/api/appdetails?appids={g['appid']}&l=schinese", timeout=15)
            if gd.ok:
                gd_data = gd.json().get(str(g["appid"]), {})
                if gd_data.get("success"):
                    d = gd_data.get("data", {})
                    genres = ",".join(x.get("description","") for x in d.get("genres",[]))
                    cats = ",".join(x.get("description","") for x in d.get("categories",[]))
                    c.execute("""INSERT OR REPLACE INTO game_details (appid, name, genres, categories) VALUES (?,?,?,?)""",
                        (g["appid"], g.get("name",""), genres, cats))
                    detail_count += 1
        except: pass
    conn.commit()
    print(f"  details: {detail_count}")
    
    # summary
    print(f"\n=== DONE ===")
    print(f"summaries: {len(summaries)} | friends: {len(friend_ids)} | owned: {len(games)} | achievements games: {ach_count}")
    conn.close()

def today_str():
    from datetime import datetime, timezone, timedelta
    return datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")

if __name__ == "__main__":
    main()
