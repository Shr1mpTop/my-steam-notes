"""
Test ALL Steam Web API endpoints accessible with a user-level API key.
Generates a markdown report at docs/api-test-results-full.md
"""
import os
import json
import time
from dotenv import load_dotenv
import requests

load_dotenv()

KEY = os.getenv("STEAM_API_KEY")
SID = os.getenv("STEAM_ID")
OUT = os.path.join(os.path.dirname(__file__), "docs", "api-test-results-full.md")
CS2_APPID = 730
DOTA2_APPID = 570

session = requests.Session()
session.params = {"key": KEY, "format": "json"}

results = []


def call_api(interface, method, version, params=None, http_method="GET", base_url="https://api.steampowered.com"):
    url = f"{base_url}/{interface}/{method}/{version}/"
    p = dict(params or {})
    try:
        if http_method == "GET":
            r = session.get(url, params=p, timeout=15)
        else:
            r = session.post(url, data=p, timeout=15)
        try:
            body = r.json()
        except Exception:
            body = r.text[:2000]
        return r.status_code, body
    except Exception as e:
        return -1, str(e)


def store(interface_method_version, desc, code, body, category=""):
    results.append((category, interface_method_version, desc, code, body))


def truncate(obj, limit=3000):
    text = json.dumps(obj, ensure_ascii=False, indent=2)
    if len(text) > limit:
        text = text[:limit] + "\n... (truncated)"
    return text


# ============================================================
#  ISteamWebAPIUtil
# ============================================================
c, b = call_api("ISteamWebAPIUtil", "GetServerInfo", "v1")
store("ISteamWebAPIUtil/GetServerInfo/v1", "获取服务器信息", c, b, "ISteamWebAPIUtil")

c, b = call_api("ISteamWebAPIUtil", "GetSupportedAPIList", "v1")
store("ISteamWebAPIUtil/GetSupportedAPIList/v1", "获取支持的API列表", c, b, "ISteamWebAPIUtil")

# ============================================================
#  ISteamUser
# ============================================================
c, b = call_api("ISteamUser", "GetPlayerSummaries", "v0002", {"steamids": SID})
store("ISteamUser/GetPlayerSummaries/v0002", "获取玩家基础信息", c, b, "ISteamUser")

c, b = call_api("ISteamUser", "GetPlayerBans", "v1", {"steamids": SID})
store("ISteamUser/GetPlayerBans/v1", "获取玩家封禁状态", c, b, "ISteamUser")

c, b = call_api("ISteamUser", "GetFriendList", "v1", {"steamid": SID, "relationship": "friend"})
store("ISteamUser/GetFriendList/v1", "获取好友列表", c, b, "ISteamUser")

c, b = call_api("ISteamUser", "GetUserGroupList", "v1", {"steamid": SID})
store("ISteamUser/GetUserGroupList/v1", "获取玩家加入的群组", c, b, "ISteamUser")

c, b = call_api("ISteamUser", "ResolveVanityURL", "v1", {"vanityurl": "chr(0x1D11E)"})
store("ISteamUser/ResolveVanityURL/v1", "通过自定义URL解析SteamID", c, b, "ISteamUser")

# ============================================================
#  ISteamUserStats
# ============================================================
c, b = call_api("ISteamUserStats", "GetPlayerAchievements", "v1", {"steamid": SID, "appid": CS2_APPID})
store("ISteamUserStats/GetPlayerAchievements/v1", "获取玩家成就 (CS2)", c, b, "ISteamUserStats")

c, b = call_api("ISteamUserStats", "GetUserStatsForGame", "v2", {"steamid": SID, "appid": CS2_APPID})
store("ISteamUserStats/GetUserStatsForGame/v2", "获取玩家游戏详细统计 (CS2)", c, b, "ISteamUserStats")

c, b = call_api("ISteamUserStats", "GetGlobalAchievementPercentagesForApp", "v2", {"gameid": CS2_APPID})
store("ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2", "获取全球成就完成率 (CS2)", c, b, "ISteamUserStats")

c, b = call_api("ISteamUserStats", "GetGlobalStatsForGame", "v1", {"appid": CS2_APPID, "count": 1, "name[0]": "global.map.emp_isle"})
store("ISteamUserStats/GetGlobalStatsForGame/v1", "获取游戏全局统计 (CS2)", c, b, "ISteamUserStats")

c, b = call_api("ISteamUserStats", "GetNumberOfCurrentPlayers", "v1", {"appid": CS2_APPID})
store("ISteamUserStats/GetNumberOfCurrentPlayers/v1", "获取当前在线玩家数 (CS2)", c, b, "ISteamUserStats")

c, b = call_api("ISteamUserStats", "GetSchemaForGame", "v2", {"appid": CS2_APPID})
store("ISteamUserStats/GetSchemaForGame/v2", "获取游戏成就Schema (CS2)", c, b, "ISteamUserStats")

# ============================================================
#  IPlayerService
# ============================================================
c, b = call_api("IPlayerService", "GetOwnedGames", "v1", {
    "steamid": SID, "include_appinfo": "true", "include_played_free_games": "true"
})
store("IPlayerService/GetOwnedGames/v1", "获取所有游戏及游玩时长", c, b, "IPlayerService")

c, b = call_api("IPlayerService", "GetRecentlyPlayedGames", "v1", {"steamid": SID})
store("IPlayerService/GetRecentlyPlayedGames/v1", "获取近两周游玩记录", c, b, "IPlayerService")

c, b = call_api("IPlayerService", "GetSteamLevel", "v1", {"steamid": SID})
store("IPlayerService/GetSteamLevel/v1", "获取Steam等级", c, b, "IPlayerService")

c, b = call_api("IPlayerService", "GetBadges", "v1", {"steamid": SID})
store("IPlayerService/GetBadges/v1", "获取徽章信息", c, b, "IPlayerService")

c, b = call_api("IPlayerService", "GetCommunityBadgeProgress", "v1", {"steamid": SID, "badgeid": 2})
store("IPlayerService/GetCommunityBadgeProgress/v1", "获取社区徽章进度", c, b, "IPlayerService")

c, b = call_api("IPlayerService", "IsPlayingSharedGame", "v1", {"steamid": SID, "appid_playing": CS2_APPID})
store("IPlayerService/IsPlayingSharedGame/v1", "检查是否为共享游戏 (CS2)", c, b, "IPlayerService")

# ============================================================
#  ISteamNews
# ============================================================
c, b = call_api("ISteamNews", "GetNewsForApp", "v2", {"appid": CS2_APPID, "count": 3, "maxlength": 200})
store("ISteamNews/GetNewsForApp/v2", "获取游戏新闻 (CS2)", c, b, "ISteamNews")

# ============================================================
#  ISteamApps
# ============================================================
c, b = call_api("ISteamApps", "GetServersAtAddress", "v1", {"addr": "155.133.248.50"})
store("ISteamApps/GetServersAtAddress/v1", "查询IP上的服务器", c, b, "ISteamApps")

c, b = call_api("ISteamApps", "UpToDateCheck", "v1", {"appid": CS2_APPID})
store("ISteamApps/UpToDateCheck/v1", "检查游戏版本是否最新 (CS2)", c, b, "ISteamApps")

# ============================================================
#  ISteamEconomy
# ============================================================
c, b = call_api("ISteamEconomy", "GetAssetPrices", "v1", {"appid": CS2_APPID})
store("ISteamEconomy/GetAssetPrices/v1", "获取物品价格 (CS2)", c, b, "ISteamEconomy")

c, b = call_api("ISteamEconomy", "GetAssetClassInfo", "v1", {"appid": CS2_APPID, "class_count": 1, "classid[0]": "520025252"})
store("ISteamEconomy/GetAssetClassInfo/v1", "获取物品类别信息 (CS2)", c, b, "ISteamEconomy")

# ============================================================
#  IEconService (Trade offers)
# ============================================================
c, b = call_api("IEconService", "GetTradeOffers", "v1", {
    "get_sent_offers": 1, "get_received_offers": 1, "active_only": 1
})
store("IEconService/GetTradeOffers/v1", "获取交易报价列表", c, b, "IEconService")

c, b = call_api("IEconService", "GetTradeOffersSummary", "v1")
store("IEconService/GetTradeOffersSummary/v1", "获取交易报价摘要", c, b, "IEconService")

c, b = call_api("IEconService", "GetTradeHistory", "v1", {"max_trades": 5})
store("IEconService/GetTradeHistory/v1", "获取交易历史", c, b, "IEconService")

# ============================================================
#  IWishlistService
# ============================================================
c, b = call_api("IWishlistService", "GetWishlist", "v1", {"steamid": SID})
store("IWishlistService/GetWishlist/v1", "获取愿望单", c, b, "IWishlistService")

c, b = call_api("IWishlistService", "GetWishlistItemCount", "v1", {"steamid": SID})
store("IWishlistService/GetWishlistItemCount/v1", "获取愿望单数量", c, b, "IWishlistService")

# ============================================================
#  IStoreService
# ============================================================
c, b = call_api("IStoreService", "GetGamesFollowed", "v1")
store("IStoreService/GetGamesFollowed/v1", "获取关注的游戏", c, b, "IStoreService")

c, b = call_api("IStoreService", "GetGamesFollowedCount", "v1")
store("IStoreService/GetGamesFollowedCount/v1", "获取关注的游戏数量", c, b, "IStoreService")

c, b = call_api("IStoreService", "GetRecommendedTagsForUser", "v1")
store("IStoreService/GetRecommendedTagsForUser/v1", "获取推荐标签", c, b, "IStoreService")

# ============================================================
#  IPublishedFileService (Workshop)
# ============================================================
c, b = call_api("IPublishedFileService", "GetUserFiles", "v1", {"steamid": SID, "numperpage": 3})
store("IPublishedFileService/GetUserFiles/v1", "获取用户的创意工坊文件", c, b, "IPublishedFileService")

c, b = call_api("IPublishedFileService", "GetUserFileCount", "v1", {"steamid": SID})
store("IPublishedFileService/GetUserFileCount/v1", "获取用户创意工坊文件数量", c, b, "IPublishedFileService")

c, b = call_api("IPublishedFileService", "GetUserVoteSummary", "v1", {"steamid": SID})
store("IPublishedFileService/GetUserVoteSummary/v1", "获取用户投票摘要", c, b, "IPublishedFileService")

# ============================================================
#  ISteamRemoteStorage
# ============================================================
c, b = call_api("ISteamRemoteStorage", "GetUGCFileDetails", "v1", {"ugcid": 1, "appid": CS2_APPID})
store("ISteamRemoteStorage/GetUGCFileDetails/v1", "获取UGC文件详情", c, b, "ISteamRemoteStorage")

# ============================================================
#  ISteamDirectory
# ============================================================
c, b = call_api("ISteamDirectory", "GetCMList", "v1", {"cellid": 0})
store("ISteamDirectory/GetCMList/v1", "获取连接管理器列表", c, b, "ISteamDirectory")

c, b = call_api("ISteamDirectory", "GetCMListForConnect", "v1", {"cellid": 0})
store("ISteamDirectory/GetCMListForConnect/v1", "获取CM连接信息", c, b, "ISteamDirectory")

c, b = call_api("ISteamDirectory", "GetSteamPipeDomains", "v1")
store("ISteamDirectory/GetSteamPipeDomains/v1", "获取SteamPipe域名", c, b, "ISteamDirectory")

# ============================================================
#  IGameServersService
# ============================================================
c, b = call_api("IGameServersService", "GetAccountList", "v1")
store("IGameServersService/GetAccountList/v1", "获取游戏服务器账号列表", c, b, "IGameServersService")

# ============================================================
#  IEconItems (CS2 = 730)
# ============================================================
c, b = call_api("IEconItems_730", "GetPlayerItems", "v1", {"steamid": SID})
store("IEconItems_730/GetPlayerItems/v1", "获取CS2玩家物品", c, b, "IEconItems_730")

c, b = call_api("IEconItems_730", "GetSchema", "v2")
store("IEconItems_730/GetSchema/v2", "获取CS2物品Schema", c, b, "IEconItems_730")

c, b = call_api("IEconItems_730", "GetSchemaURL", "v2")
store("IEconItems_730/GetSchemaURL/v2", "获取CS2 Schema URL", c, b, "IEconItems_730")

c, b = call_api("IEconItems_730", "GetStoreMetaData", "v1")
store("IEconItems_730/GetStoreMetaData/v1", "获取CS2商店元数据", c, b, "IEconItems_730")

# ============================================================
#  IGCVersion (CS2)
# ============================================================
c, b = call_api("IGCVersion_730", "GetServerVersion", "v1")
store("IGCVersion_730/GetServerVersion/v1", "获取CS2 GC服务器版本", c, b, "IGCVersion_730")

# ============================================================
#  ICSGOServers_730
# ============================================================
c, b = call_api("ICSGOServers_730", "GetGameServersStatus", "v1")
store("ICSGOServers_730/GetGameServersStatus/v1", "获取CS2服务器状态", c, b, "ICSGOServers_730")

c, b = call_api("ICSGOServers_730", "GetGameMapsPlaytime", "v1", {"interval": "month"})
store("ICSGOServers_730/GetGameMapsPlaytime/v1", "获取CS2地图游玩时间统计", c, b, "ICSGOServers_730")

# ============================================================
#  ICSGOPlayers_730
# ============================================================
c, b = call_api("ICSGOPlayers_730", "GetNextMatchSharingCode", "v1", {
    "steamid": SID, "steamidkey": "dummy", "knowncode": "dummy"
})
store("ICSGOPlayers_730/GetNextMatchSharingCode/v1", "获取下一场比赛分享码 (CS2)", c, b, "ICSGOPlayers_730")

# ============================================================
#  IDOTA2Match_570 (Dota2 match data)
# ============================================================
c, b = call_api("IDOTA2Match_570", "GetMatchHistory", "v1", {"matches_requested": 3})
store("IDOTA2Match_570/GetMatchHistory/v1", "获取Dota2比赛历史", c, b, "IDOTA2Match_570")

c, b = call_api("IDOTA2Match_570", "GetTopLiveGame", "v1")
store("IDOTA2Match_570/GetTopLiveGame/v1", "获取Dota2热门直播比赛", c, b, "IDOTA2Match_570")

c, b = call_api("IDOTA2Match_570", "GetLiveLeagueGames", "v1")
store("IDOTA2Match_570/GetLiveLeagueGames/v1", "获取Dota2联赛直播", c, b, "IDOTA2Match_570")

# ============================================================
#  IEconDOTA2_570
# ============================================================
c, b = call_api("IEconDOTA2_570", "GetHeroes", "v1", {"language": "schinese"})
store("IEconDOTA2_570/GetHeroes/v1", "获取Dota2英雄列表(中文)", c, b, "IEconDOTA2_570")

c, b = call_api("IEconDOTA2_570", "GetRarities", "v1", {"language": "schinese"})
store("IEconDOTA2_570/GetRarities/v1", "获取Dota2物品稀有度(中文)", c, b, "IEconDOTA2_570")

c, b = call_api("IEconDOTA2_570", "GetTournamentPrizePool", "v1", {"prizepoolid": 0})
store("IEconDOTA2_570/GetTournamentPrizePool/v1", "获取Dota2锦标赛奖金池", c, b, "IEconDOTA2_570")

# ============================================================
#  ITFItems_440 / ITFSystem_440 (TF2)
# ============================================================
c, b = call_api("ITFItems_440", "GetGoldenWrenches", "v2")
store("ITFItems_440/GetGoldenWrenches/v2", "获取TF2金扳手列表", c, b, "ITFItems_440")

c, b = call_api("ITFSystem_440", "GetWorldStatus", "v1")
store("ITFSystem_440/GetWorldStatus/v1", "获取TF2世界状态", c, b, "ITFSystem_440")

# ============================================================
#  IEconItems_440 (TF2)
# ============================================================
c, b = call_api("IEconItems_440", "GetSchemaURL", "v1")
store("IEconItems_440/GetSchemaURL/v1", "获取TF2 Schema URL", c, b, "IEconItems_440")

c, b = call_api("IEconItems_440", "GetStoreMetaData", "v1")
store("IEconItems_440/GetStoreMetaData/v1", "获取TF2商店元数据", c, b, "IEconItems_440")

c, b = call_api("IEconItems_440", "GetStoreStatus", "v1")
store("IEconItems_440/GetStoreStatus/v1", "获取TF2商店状态", c, b, "IEconItems_440")

# ============================================================
#  ISteamBroadcast
# ============================================================
c, b = call_api("ISteamBroadcast", "ViewerHeartbeat", "v1", {"steamid": SID})
store("ISteamBroadcast/ViewerHeartbeat/v1", "广播观众心跳", c, b, "ISteamBroadcast")

# ============================================================
#  ISteamUserAuth
# ============================================================
c, b = call_api("ISteamUserAuth", "AuthenticateUserTicket", "v1", {"appid": CS2_APPID, "ticket": "dummy"})
store("ISteamUserAuth/AuthenticateUserTicket/v1", "验证用户票据", c, b, "ISteamUserAuth")

# ============================================================
#  ISteamUserOAuth
# ============================================================
c, b = call_api("ISteamUserOAuth", "GetTokenDetails", "v1", {"access_token": "dummy"})
store("ISteamUserOAuth/GetTokenDetails/v1", "获取Token详情", c, b, "ISteamUserOAuth")

# ============================================================
#  IInventoryService
# ============================================================
c, b = call_api("IInventoryService", "GetPriceSheet", "v1", {"appid": CS2_APPID})
store("IInventoryService/GetPriceSheet/v1", "获取价格表 (CS2)", c, b, "IInventoryService")

# ============================================================
#  Store API (store.steampowered.com)
# ============================================================
c_store, b_store = call_api(
    "api", "appdetails", "v1",  # version unused, just for structure
    params={"appids": CS2_APPID, "l": "schinese"},
    base_url="https://store.steampowered.com",
)
store("Store API /appdetails", "获取商店详情 (CS2 中文)", c_store, b_store, "Store API")

c_store, b_store = call_api(
    "api", "featuredcategories", "v1",
    params={"l": "schinese"},
    base_url="https://store.steampowered.com",
)
store("Store API /featuredcategories", "获取商店推荐分类(中文)", c_store, b_store, "Store API")

c_store, b_store = call_api(
    "api", "packagedetails", "v1",
    params={"packageids": "62002", "l": "schinese"},
    base_url="https://store.steampowered.com",
)
store("Store API /packagedetails", "获取包详情(中文)", c_store, b_store, "Store API")

c_store, b_store = call_api(
    "api", "storesearch", "v1",
    params={"term": "Cyberpunk", "l": "schinese", "cc": "SG"},
    base_url="https://store.steampowered.com",
)
store("Store API /storesearch", "商店搜索 Cyberpunk(中文)", c_store, b_store, "Store API")

c_store, b_store = call_api(
    "api", "salepage", "v1",
    params={"id": 1},
    base_url="https://store.steampowered.com",
)
store("Store API /salepage", "获取促销页面", c_store, b_store, "Store API")


# ============================================================
# Generate markdown report
# ============================================================
def write_report():
    # Group by category
    categories = {}
    for cat, endpoint, desc, code, body in results:
        categories.setdefault(cat, []).append((endpoint, desc, code, body))

    success_count = sum(1 for _, _, _, c, _ in results if c == 200)
    fail_count = len(results) - success_count

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("# Steam Web API 完整测试结果\n\n")
        f.write(f"Steam ID: `{SID}`  \n")
        f.write(f"测试接口数: **{len(results)}** | 成功: **{success_count}** | 失败/错误: **{fail_count}**\n\n")
        f.write("---\n\n")

        # Summary table
        f.write("## 总览表\n\n")
        f.write("| # | 接口 | 说明 | 状态码 |\n")
        f.write("|---|------|------|--------|\n")
        for i, (cat, endpoint, desc, code, body) in enumerate(results, 1):
            icon = "OK" if code == 200 else "FAIL"
            f.write(f"| {i} | `{endpoint}` | {desc} | {code} {icon} |\n")
        f.write("\n---\n\n")

        # Detailed results by category
        for cat, items in categories.items():
            f.write(f"## {cat}\n\n")
            for endpoint, desc, code, body in items:
                f.write(f"### {desc}\n\n")
                f.write(f"**接口**: `{endpoint}`  \n")
                f.write(f"**状态码**: `{code}`\n\n")
                text = truncate(body)
                f.write(f"<details><summary>返回数据</summary>\n\n```json\n{text}\n```\n\n</details>\n\n")
            f.write("---\n\n")

    print(f"Report written to {OUT}")
    print(f"Total: {len(results)} endpoints | Success: {success_count} | Failed: {fail_count}")


if __name__ == "__main__":
    write_report()
