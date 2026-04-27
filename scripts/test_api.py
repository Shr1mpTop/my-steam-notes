import os
from dotenv import load_dotenv
import requests

load_dotenv()

STEAM_API_KEY = os.getenv("STEAM_API_KEY")
STEAM_ID = os.getenv("STEAM_ID")

# 1. 测试 GetPlayerSummaries — 验证 key 和 steamid 是否有效
url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
resp = requests.get(url, params={"key": STEAM_API_KEY, "steamids": STEAM_ID})

print(f"Status: {resp.status_code}")
data = resp.json()
players = data["response"].get("players", [])

if players:
    p = players[0]
    print(f"Nickname: {p['personaname']}")
    print(f"SteamID:  {p['steamid']}")
    print(f"Online:   {'Yes' if p['personastate'] else 'No'}")
else:
    print("No player data returned. Check STEAM_ID or privacy settings.")
