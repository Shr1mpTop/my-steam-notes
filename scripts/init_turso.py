"""Initialize Turso database schema."""
import sys
sys.path.insert(0, ".")
from scripts.turso_db import execute

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS owned_games (
        appid INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        playtime_forever INTEGER DEFAULT 0,
        playtime_windows_forever INTEGER DEFAULT 0,
        playtime_mac_forever INTEGER DEFAULT 0,
        playtime_linux_forever INTEGER DEFAULT 0,
        playtime_deck_forever INTEGER DEFAULT 0,
        img_icon_url TEXT,
        rtime_last_played INTEGER DEFAULT 0,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS daily_snapshots (
        date TEXT NOT NULL,
        appid INTEGER NOT NULL,
        name TEXT NOT NULL,
        playtime_forever INTEGER DEFAULT 0,
        daily_playtime INTEGER DEFAULT 0,
        PRIMARY KEY (date, appid)
    )""",
    """CREATE TABLE IF NOT EXISTS recent_sessions (
        snapshot_date TEXT NOT NULL,
        appid INTEGER NOT NULL,
        name TEXT NOT NULL,
        playtime_2weeks INTEGER DEFAULT 0,
        playtime_forever INTEGER DEFAULT 0,
        PRIMARY KEY (snapshot_date, appid)
    )""",
    """CREATE TABLE IF NOT EXISTS player_daily (
        date TEXT PRIMARY KEY,
        personaname TEXT,
        personastate INTEGER,
        gameextrainfo TEXT,
        gameid TEXT,
        lastlogoff INTEGER,
        loccountrycode TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS status_polls (
        timestamp TEXT PRIMARY KEY,
        personastate INTEGER,
        gameextrainfo TEXT,
        gameid TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS game_details (
        appid INTEGER PRIMARY KEY,
        name TEXT,
        header_image TEXT,
        price_overview TEXT,
        genres TEXT,
        categories TEXT,
        type TEXT,
        updated_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS game_achievements (
        appid INTEGER NOT NULL,
        apiname TEXT NOT NULL,
        achieved INTEGER DEFAULT 0,
        unlocktime INTEGER DEFAULT 0,
        global_percent TEXT DEFAULT '0',
        PRIMARY KEY (appid, apiname)
    )""",
    """CREATE TABLE IF NOT EXISTS steam_level (
        date TEXT PRIMARY KEY,
        level INTEGER
    )""",
]

for stmt in SCHEMA:
    execute(stmt)
    print(f"OK: {stmt.split('(')[0].strip().replace('CREATE TABLE IF NOT EXISTS ', '')}")

print("\nAll tables created.")
