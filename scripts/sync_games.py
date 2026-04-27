import os
import sqlite3
from datetime import datetime, timezone
from dotenv import load_dotenv
import requests

load_dotenv()

STEAM_API_KEY = os.getenv("STEAM_API_KEY")
STEAM_ID = os.getenv("STEAM_ID")
DB_PATH = os.path.join(os.path.dirname(__file__), "steam_data.db")


def ensure_db():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS owned_games (
            appid INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            playtime_forever INTEGER DEFAULT 0,
            playtime_windows_forever INTEGER DEFAULT 0,
            playtime_mac_forever INTEGER DEFAULT 0,
            playtime_linux_forever INTEGER DEFAULT 0,
            img_icon_url TEXT,
            updated_at TEXT
        )
    """)
    con.commit()
    return con


def fetch_owned_games():
    url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
    params = {
        "key": STEAM_API_KEY,
        "steamid": STEAM_ID,
        "include_appinfo": "true",
        "include_played_free_games": "true",
        "format": "json",
    }
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()["response"]
    return data.get("games", []), data.get("game_count", 0)


def upsert_games(con, games):
    now = datetime.now(timezone.utc).isoformat()
    cur = con.cursor()
    for g in games:
        cur.execute("""
            INSERT INTO owned_games (appid, name, playtime_forever, playtime_windows_forever,
                                     playtime_mac_forever, playtime_linux_forever, img_icon_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(appid) DO UPDATE SET
                name=excluded.name,
                playtime_forever=excluded.playtime_forever,
                playtime_windows_forever=excluded.playtime_windows_forever,
                playtime_mac_forever=excluded.playtime_mac_forever,
                playtime_linux_forever=excluded.playtime_linux_forever,
                img_icon_url=excluded.img_icon_url,
                updated_at=excluded.updated_at
        """, (
            g["appid"],
            g["name"],
            g.get("playtime_forever", 0),
            g.get("playtime_windows_forever", 0),
            g.get("playtime_mac_forever", 0),
            g.get("playtime_linux_forever", 0),
            g.get("img_icon_url", ""),
            now,
        ))
    con.commit()


def main():
    print("Fetching owned games from Steam API...")
    games, total = fetch_owned_games()
    print(f"Got {len(games)} games (API reports total: {total})")

    con = ensure_db()
    upsert_games(con, games)

    # Print top 10 by playtime
    cur = con.cursor()
    cur.execute("SELECT name, playtime_forever FROM owned_games ORDER BY playtime_forever DESC LIMIT 10")
    print("\nTop 10 by playtime (minutes):")
    for name, minutes in cur.fetchall():
        print(f"  {name}: {minutes} min ({minutes / 60:.1f} h)")

    con.close()
    print(f"\nDone. DB saved to {DB_PATH}")


if __name__ == "__main__":
    main()
