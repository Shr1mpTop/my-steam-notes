"""Test all Steam APIs and write results to markdown."""
import os
import json
from dotenv import load_dotenv
import requests

load_dotenv()

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
OUT = os.path.join(os.path.dirname(__file__), "docs", "api-test-results.md")


def get(path, params=None, need_key=True):
    url = f"https://api.steampowered.com/{path}"
    p = dict(params or {})
    if need_key:
        p["key"] = KEY
    p.setdefault("format", "json")
    r = requests.get(url, params=p)
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r.status_code, body


def get_store(path, params=None):
    url = f"https://store.steampowered.com/{path}"
    r = requests.get(url, params=params or {})
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r.status_code, body


def main():
    results = []

    # ---- 1. GetPlayerSummaries ----
    code, body = get("ISteamUser/GetPlayerSummaries/v0002/", {"steamids": SID})
    results.append(("ISteamUser/GetPlayerSummaries", "获取玩家基础信息", code, body))

    # ---- 2. GetFriendList ----
    code, body = get("ISteamUser/GetFriendList/v0001/", {"steamid": SID, "relationship": "friend"})
    results.append(("ISteamUser/GetFriendList", "获取好友列表", code, body))

    # ---- 3. GetOwnedGames ----
    code, body = get("IPlayerService/GetOwnedGames/v0001/", {
        "steamid": SID,
        "include_appinfo": "true",
        "include_played_free_games": "true",
    })
    results.append(("IPlayerService/GetOwnedGames", "获取所有游戏及游玩时长", code, body))

    # ---- 4. GetRecentlyPlayedGames ----
    code, body = get("IPlayerService/GetRecentlyPlayedGames/v0001/", {"steamid": SID})
    results.append(("IPlayerService/GetRecentlyPlayedGames", "获取近两周游玩记录", code, body))

    # ---- 5. GetPlayerAchievements (use CS2 = 730) ----
    code, body = get("ISteamUserStats/GetPlayerAchievements/v0001/", {
        "steamid": SID, "appid": 730,
    })
    results.append(("ISteamUserStats/GetPlayerAchievements", "获取玩家成就 (CS2)", code, body))

    # ---- 6. GetGlobalAchievementPercentagesForApp (no key needed) ----
    code, body = get("ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/", {
        "gameid": 730,
    }, need_key=False)
    results.append((
        "ISteamUserStats/GetGlobalAchievementPercentagesForApp",
        "获取全球成就完成率 (CS2, 无需Key)",
        code, body,
    ))

    # ---- 7. Store API: appdetails ----
    code, body = get_store("api/appdetails", {"appids": 1091500, "l": "schinese"})
    results.append(("Store API /appdetails", "获取商店详情 (赛博朋克2077, 中文)", code, body))

    # ---- Write markdown ----
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("# Steam API 测试结果\n\n")
        f.write(f"Steam ID: `{SID}` | 测试时间: 来自脚本 `test_all_apis.py`\n\n---\n\n")

        for endpoint, desc, code, body in results:
            f.write(f"## {desc}\n\n")
            f.write(f"**接口**: `{endpoint}`  \n")
            f.write(f"**状态码**: `{code}`\n\n")
            text = json.dumps(body, ensure_ascii=False, indent=2)
            if len(text) > 8000:
                text = text[:8000] + "\n... (truncated)"
            f.write(f"<details><summary>返回数据</summary>\n\n```json\n{text}\n```\n\n</details>\n\n---\n\n")

    print(f"Results written to {OUT}")


if __name__ == "__main__":
    main()
