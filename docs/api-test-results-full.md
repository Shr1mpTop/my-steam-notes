# Steam Web API 完整测试结果

Steam ID: `76561198367786896`  
测试接口数: **68** | 成功: **54** | 失败/错误: **14**

---

## 总览表

| # | 接口 | 说明 | 状态码 |
|---|------|------|--------|
| 1 | `ISteamWebAPIUtil/GetServerInfo/v1` | 获取服务器信息 | 200 OK |
| 2 | `ISteamWebAPIUtil/GetSupportedAPIList/v1` | 获取支持的API列表 | 200 OK |
| 3 | `ISteamUser/GetPlayerSummaries/v0002` | 获取玩家基础信息 | 200 OK |
| 4 | `ISteamUser/GetPlayerBans/v1` | 获取玩家封禁状态 | 200 OK |
| 5 | `ISteamUser/GetFriendList/v1` | 获取好友列表 | 200 OK |
| 6 | `ISteamUser/GetUserGroupList/v1` | 获取玩家加入的群组 | 200 OK |
| 7 | `ISteamUser/ResolveVanityURL/v1` | 通过自定义URL解析SteamID | 200 OK |
| 8 | `ISteamUserStats/GetPlayerAchievements/v1` | 获取玩家成就 (CS2) | 200 OK |
| 9 | `ISteamUserStats/GetUserStatsForGame/v2` | 获取玩家游戏详细统计 (CS2) | 200 OK |
| 10 | `ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2` | 获取全球成就完成率 (CS2) | 200 OK |
| 11 | `ISteamUserStats/GetGlobalStatsForGame/v1` | 获取游戏全局统计 (CS2) | 200 OK |
| 12 | `ISteamUserStats/GetNumberOfCurrentPlayers/v1` | 获取当前在线玩家数 (CS2) | 200 OK |
| 13 | `ISteamUserStats/GetSchemaForGame/v2` | 获取游戏成就Schema (CS2) | 200 OK |
| 14 | `IPlayerService/GetOwnedGames/v1` | 获取所有游戏及游玩时长 | 200 OK |
| 15 | `IPlayerService/GetRecentlyPlayedGames/v1` | 获取近两周游玩记录 | 200 OK |
| 16 | `IPlayerService/GetSteamLevel/v1` | 获取Steam等级 | 200 OK |
| 17 | `IPlayerService/GetBadges/v1` | 获取徽章信息 | 200 OK |
| 18 | `IPlayerService/GetCommunityBadgeProgress/v1` | 获取社区徽章进度 | 200 OK |
| 19 | `IPlayerService/IsPlayingSharedGame/v1` | 检查是否为共享游戏 (CS2) | 200 OK |
| 20 | `ISteamNews/GetNewsForApp/v2` | 获取游戏新闻 (CS2) | 200 OK |
| 21 | `ISteamApps/GetServersAtAddress/v1` | 查询IP上的服务器 | 200 OK |
| 22 | `ISteamApps/UpToDateCheck/v1` | 检查游戏版本是否最新 (CS2) | 400 FAIL |
| 23 | `ISteamEconomy/GetAssetPrices/v1` | 获取物品价格 (CS2) | 200 OK |
| 24 | `ISteamEconomy/GetAssetClassInfo/v1` | 获取物品类别信息 (CS2) | 400 FAIL |
| 25 | `IEconService/GetTradeOffers/v1` | 获取交易报价列表 | 200 OK |
| 26 | `IEconService/GetTradeOffersSummary/v1` | 获取交易报价摘要 | 200 OK |
| 27 | `IEconService/GetTradeHistory/v1` | 获取交易历史 | 200 OK |
| 28 | `IWishlistService/GetWishlist/v1` | 获取愿望单 | 200 OK |
| 29 | `IWishlistService/GetWishlistItemCount/v1` | 获取愿望单数量 | 200 OK |
| 30 | `IStoreService/GetGamesFollowed/v1` | 获取关注的游戏 | 400 FAIL |
| 31 | `IStoreService/GetGamesFollowedCount/v1` | 获取关注的游戏数量 | 400 FAIL |
| 32 | `IStoreService/GetRecommendedTagsForUser/v1` | 获取推荐标签 | 401 FAIL |
| 33 | `IPublishedFileService/GetUserFiles/v1` | 获取用户的创意工坊文件 | 200 OK |
| 34 | `IPublishedFileService/GetUserFileCount/v1` | 获取用户创意工坊文件数量 | 200 OK |
| 35 | `IPublishedFileService/GetUserVoteSummary/v1` | 获取用户投票摘要 | 401 FAIL |
| 36 | `ISteamRemoteStorage/GetUGCFileDetails/v1` | 获取UGC文件详情 | 404 FAIL |
| 37 | `ISteamDirectory/GetCMList/v1` | 获取连接管理器列表 | 200 OK |
| 38 | `ISteamDirectory/GetCMListForConnect/v1` | 获取CM连接信息 | 200 OK |
| 39 | `ISteamDirectory/GetSteamPipeDomains/v1` | 获取SteamPipe域名 | 200 OK |
| 40 | `IGameServersService/GetAccountList/v1` | 获取游戏服务器账号列表 | 200 OK |
| 41 | `IEconItems_730/GetPlayerItems/v1` | 获取CS2玩家物品 | 410 FAIL |
| 42 | `IEconItems_730/GetSchema/v2` | 获取CS2物品Schema | 410 FAIL |
| 43 | `IEconItems_730/GetSchemaURL/v2` | 获取CS2 Schema URL | 410 FAIL |
| 44 | `IEconItems_730/GetStoreMetaData/v1` | 获取CS2商店元数据 | 200 OK |
| 45 | `IGCVersion_730/GetServerVersion/v1` | 获取CS2 GC服务器版本 | 200 OK |
| 46 | `ICSGOServers_730/GetGameServersStatus/v1` | 获取CS2服务器状态 | 200 OK |
| 47 | `ICSGOServers_730/GetGameMapsPlaytime/v1` | 获取CS2地图游玩时间统计 | 400 FAIL |
| 48 | `ICSGOPlayers_730/GetNextMatchSharingCode/v1` | 获取下一场比赛分享码 (CS2) | 403 FAIL |
| 49 | `IDOTA2Match_570/GetMatchHistory/v1` | 获取Dota2比赛历史 | 200 OK |
| 50 | `IDOTA2Match_570/GetTopLiveGame/v1` | 获取Dota2热门直播比赛 | 400 FAIL |
| 51 | `IDOTA2Match_570/GetLiveLeagueGames/v1` | 获取Dota2联赛直播 | 200 OK |
| 52 | `IEconDOTA2_570/GetHeroes/v1` | 获取Dota2英雄列表(中文) | 200 OK |
| 53 | `IEconDOTA2_570/GetRarities/v1` | 获取Dota2物品稀有度(中文) | 200 OK |
| 54 | `IEconDOTA2_570/GetTournamentPrizePool/v1` | 获取Dota2锦标赛奖金池 | 200 OK |
| 55 | `ITFItems_440/GetGoldenWrenches/v2` | 获取TF2金扳手列表 | 200 OK |
| 56 | `ITFSystem_440/GetWorldStatus/v1` | 获取TF2世界状态 | 200 OK |
| 57 | `IEconItems_440/GetSchemaURL/v1` | 获取TF2 Schema URL | 200 OK |
| 58 | `IEconItems_440/GetStoreMetaData/v1` | 获取TF2商店元数据 | 200 OK |
| 59 | `IEconItems_440/GetStoreStatus/v1` | 获取TF2商店状态 | 200 OK |
| 60 | `ISteamBroadcast/ViewerHeartbeat/v1` | 广播观众心跳 | 400 FAIL |
| 61 | `ISteamUserAuth/AuthenticateUserTicket/v1` | 验证用户票据 | 200 OK |
| 62 | `ISteamUserOAuth/GetTokenDetails/v1` | 获取Token详情 | 200 OK |
| 63 | `IInventoryService/GetPriceSheet/v1` | 获取价格表 (CS2) | 200 OK |
| 64 | `Store API /appdetails` | 获取商店详情 (CS2 中文) | 200 OK |
| 65 | `Store API /featuredcategories` | 获取商店推荐分类(中文) | 200 OK |
| 66 | `Store API /packagedetails` | 获取包详情(中文) | 200 OK |
| 67 | `Store API /storesearch` | 商店搜索 Cyberpunk(中文) | 200 OK |
| 68 | `Store API /salepage` | 获取促销页面 | 200 OK |

---

## ISteamWebAPIUtil

### 获取服务器信息

**接口**: `ISteamWebAPIUtil/GetServerInfo/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "servertime": 1777303908,
  "servertimestring": "Mon Apr 27 08:31:48 2026"
}
```

</details>

### 获取支持的API列表

**接口**: `ISteamWebAPIUtil/GetSupportedAPIList/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "apilist": {
    "interfaces": [
      {
        "name": "IClientStats_1046930",
        "methods": [
          {
            "name": "ReportEvent",
            "version": 1,
            "httpmethod": "POST",
            "parameters": []
          }
        ]
      },
      {
        "name": "ICSGOPlayers_730",
        "methods": [
          {
            "name": "GetNextMatchSharingCode",
            "version": 1,
            "httpmethod": "GET",
            "parameters": [
              {
                "name": "steamid",
                "type": "uint64",
                "optional": false,
                "description": "The SteamID of the user"
              },
              {
                "name": "steamidkey",
                "type": "string",
                "optional": false,
                "description": "Authentication obtained from the SteamID"
              },
              {
                "name": "knowncode",
                "type": "string",
                "optional": false,
                "description": "Previously known match sharing code obtained from the SteamID"
              }
            ]
          }
        ]
      },
      {
        "name": "ICSGOServers_730",
        "methods": [
          {
            "name": "GetGameMapsPlaytime",
            "version": 1,
            "httpmethod": "GET",
            "parameters": [
              {
                "name": "interval",
                "type": "string",
                "optional": false,
                "description": "What recent interval is requested, possible values: day, week, month"
              },
              {
                "name": "gamemode",
                "type": "string",
                "optional": false,
                "description": "What game mode is requested, possible values: competitive, casual"
              },
              {
                "name": "mapgroup",
                "type": "string",
                "optional": false,
                "description": "What maps are requested, possible values: operation"
              }
            ]
          },
          {
            "name": "GetGameServersStatus",
            "version": 1,
            "httpmethod": "GET",
            "parameters": []
          }
        ]
      },
      {
        "name": "ICSGOTournaments_730",
        "methods": [
          {
            "name": "GetTournamentFantasyLineup",
            "version": 1,
            "httpmethod": "GET",
            "parameters": [
              {
                "name": "event",
                "type": "uint32",
                "optional": false,
                "description": "The event ID"
              },
              {
                "name": "steamid",
                "type": "uint64",
                "optional": false,
                "description": "The SteamID of the user inventory"
              },
              {
                "name": "steamidkey",
                "type": "string",
                "optional": fal
... (truncated)
```

</details>

---

## ISteamUser

### 获取玩家基础信息

**接口**: `ISteamUser/GetPlayerSummaries/v0002`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "players": [
      {
        "steamid": "76561198367786896",
        "communityvisibilitystate": 3,
        "profilestate": 1,
        "personaname": "chr(0x1D11E)",
        "profileurl": "https://steamcommunity.com/profiles/76561198367786896/",
        "avatar": "https://avatars.steamstatic.com/519f37920ebcc07a84cc56597621eab752a5161b.jpg",
        "avatarmedium": "https://avatars.steamstatic.com/519f37920ebcc07a84cc56597621eab752a5161b_medium.jpg",
        "avatarfull": "https://avatars.steamstatic.com/519f37920ebcc07a84cc56597621eab752a5161b_full.jpg",
        "avatarhash": "519f37920ebcc07a84cc56597621eab752a5161b",
        "lastlogoff": 1777226597,
        "personastate": 1,
        "realname": "ℂ𝕙𝕒𝕣𝕝𝕚𝕖 ℍ𝕠𝕙",
        "primaryclanid": "103582791429521408",
        "timecreated": 1486864037,
        "personastateflags": 0,
        "gameextrainfo": "Apex Legends",
        "gameid": "1172470",
        "loccountrycode": "SG"
      }
    ]
  }
}
```

</details>

### 获取玩家封禁状态

**接口**: `ISteamUser/GetPlayerBans/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "players": [
    {
      "SteamId": "76561198367786896",
      "CommunityBanned": false,
      "VACBanned": false,
      "NumberOfVACBans": 0,
      "DaysSinceLastBan": 0,
      "NumberOfGameBans": 0,
      "EconomyBan": "none"
    }
  ]
}
```

</details>

### 获取好友列表

**接口**: `ISteamUser/GetFriendList/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "friendslist": {
    "friends": [
      {
        "steamid": "76561198193795227",
        "relationship": "friend",
        "friend_since": 1769694426
      },
      {
        "steamid": "76561198261996858",
        "relationship": "friend",
        "friend_since": 1762529401
      },
      {
        "steamid": "76561198287273887",
        "relationship": "friend",
        "friend_since": 1632322132
      },
      {
        "steamid": "76561198288081892",
        "relationship": "friend",
        "friend_since": 1623733282
      },
      {
        "steamid": "76561198295506047",
        "relationship": "friend",
        "friend_since": 1687791910
      },
      {
        "steamid": "76561198297254647",
        "relationship": "friend",
        "friend_since": 1632496169
      },
      {
        "steamid": "76561198311844129",
        "relationship": "friend",
        "friend_since": 1623499676
      },
      {
        "steamid": "76561198311885845",
        "relationship": "friend",
        "friend_since": 1632408517
      },
      {
        "steamid": "76561198327290414",
        "relationship": "friend",
        "friend_since": 1694613440
      },
      {
        "steamid": "76561198353969290",
        "relationship": "friend",
        "friend_since": 1769077618
      },
      {
        "steamid": "76561198365517134",
        "relationship": "friend",
        "friend_since": 1749128738
      },
      {
        "steamid": "76561198374143385",
        "relationship": "friend",
        "friend_since": 1642178581
      },
      {
        "steamid": "76561198390929632",
        "relationship": "friend",
        "friend_since": 1655808483
      },
      {
        "steamid": "76561198399124819",
        "relationship": "friend",
        "friend_since": 1701831816
      },
      {
        "steamid": "76561198429741002",
        "relationship": "friend",
        "friend_since": 1655708716
      },
      {
        "steamid": "76561198835815502",
        "relationship": "friend",
        "friend_since": 1624779112
      },
      {
        "steamid": "76561198850027063",
        "relationship": "friend",
        "friend_since": 1672933505
      },
      {
        "steamid": "76561198852270175",
        "relationship": "friend",
        "friend_since": 1722594368
      },
      {
        "steamid": "76561198864549038",
        "relationship": "friend",
        "friend_since": 1632186423
      },
      {
        "steamid": "76561199010155610",
        "relationship": "friend",
        "friend_since": 1677769500
      },
      {
        "steamid": "76561199031439722",
        "relationship": "friend",
        "friend_since": 1707402994
      },
      {
        "steamid": "76561199037013836",
        "relationship": "friend",
        "friend_since": 1719387500
      },
      {
        "steamid": "76561199069419608",
        "relationship": "friend",
        "friend_since": 1644508534
      },
      {
        "steamid": "76561199079104056",
        "relatio
... (truncated)
```

</details>

### 获取玩家加入的群组

**接口**: `ISteamUser/GetUserGroupList/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "success": true,
    "groups": []
  }
}
```

</details>

### 通过自定义URL解析SteamID

**接口**: `ISteamUser/ResolveVanityURL/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "success": 42,
    "message": "No match"
  }
}
```

</details>

---

## ISteamUserStats

### 获取玩家成就 (CS2)

**接口**: `ISteamUserStats/GetPlayerAchievements/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "playerstats": {
    "steamID": "76561198367786896",
    "gameName": "Counter-Strike 2",
    "achievements": [
      {
        "apiname": "PLAY_CS2",
        "achieved": 1,
        "unlocktime": 1695872502
      }
    ],
    "success": true
  }
}
```

</details>

### 获取玩家游戏详细统计 (CS2)

**接口**: `ISteamUserStats/GetUserStatsForGame/v2`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "playerstats": {
    "steamID": "76561198367786896",
    "gameName": "Counter-Strike 2",
    "stats": [
      {
        "name": "total_kills",
        "value": 67532
      },
      {
        "name": "total_deaths",
        "value": 46248
      },
      {
        "name": "total_time_played",
        "value": 4128688
      },
      {
        "name": "total_planted_bombs",
        "value": 3960
      },
      {
        "name": "total_defused_bombs",
        "value": 640
      },
      {
        "name": "total_wins",
        "value": 27847
      },
      {
        "name": "total_damage_done",
        "value": 9491364
      },
      {
        "name": "total_money_earned",
        "value": 154230350
      },
      {
        "name": "total_rescued_hostages",
        "value": 5
      },
      {
        "name": "total_kills_knife",
        "value": 387
      },
      {
        "name": "total_kills_hegrenade",
        "value": 107
      },
      {
        "name": "total_kills_glock",
        "value": 2111
      },
      {
        "name": "total_kills_deagle",
        "value": 2489
      },
      {
        "name": "total_kills_elite",
        "value": 401
      },
      {
        "name": "total_kills_fiveseven",
        "value": 927
      },
      {
        "name": "total_kills_xm1014",
        "value": 362
      },
      {
        "name": "total_kills_mac10",
        "value": 532
      },
      {
        "name": "total_kills_ump45",
        "value": 253
      },
      {
        "name": "total_kills_p90",
        "value": 2085
      },
      {
        "name": "total_kills_awp",
        "value": 8062
      },
      {
        "name": "total_kills_ak47",
        "value": 22957
      },
      {
        "name": "total_kills_aug",
        "value": 867
      },
      {
        "name": "total_kills_famas",
        "value": 1221
      },
      {
        "name": "total_kills_g3sg1",
        "value": 253
      },
      {
        "name": "total_kills_m249",
        "value": 148
      },
      {
        "name": "total_kills_headshot",
        "value": 28824
      },
      {
        "name": "total_kills_enemy_weapon",
        "value": 6539
      },
      {
        "name": "total_wins_pistolround",
        "value": 2084
      },
      {
        "name": "total_wins_map_cs_assault",
        "value": 1
      },
      {
        "name": "total_wins_map_cs_italy",
        "value": 32
      },
      {
        "name": "total_wins_map_cs_office",
        "value": 28
      },
      {
        "name": "total_wins_map_de_aztec",
        "value": 16
      },
      {
        "name": "total_wins_map_de_cbble",
        "value": 176
      },
      {
        "name": "total_wins_map_de_dust2",
        "value": 10415
      },
      {
        "name": "total_wins_map_de_inferno",
        "value": 5409
      },
      {
        "name": "total_wins_map_de_nuke",
        "value": 1163
      },
      {
        "name": "total_wins_map_de_train",
        "value": 73
      },
      {
        "name"
... (truncated)
```

</details>

### 获取全球成就完成率 (CS2)

**接口**: `ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "achievementpercentages": {
    "achievements": [
      {
        "name": "PLAY_CS2",
        "percent": "38.7"
      }
    ]
  }
}
```

</details>

### 获取游戏全局统计 (CS2)

**接口**: `ISteamUserStats/GetGlobalStatsForGame/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "result": 8,
    "error": "Stat 'global.map.emp_isle' not found"
  }
}
```

</details>

### 获取当前在线玩家数 (CS2)

**接口**: `ISteamUserStats/GetNumberOfCurrentPlayers/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "player_count": 1261257,
    "result": 1
  }
}
```

</details>

### 获取游戏成就Schema (CS2)

**接口**: `ISteamUserStats/GetSchemaForGame/v2`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "game": {
    "gameName": "ValveTestApp260",
    "gameVersion": "247",
    "availableGameStats": {
      "stats": [
        {
          "name": "total_kills",
          "defaultvalue": 0,
          "displayName": "Enemy players killed"
        },
        {
          "name": "total_deaths",
          "defaultvalue": 0,
          "displayName": "Player Deaths"
        },
        {
          "name": "total_time_played",
          "defaultvalue": 0,
          "displayName": "Time Played"
        },
        {
          "name": "total_planted_bombs",
          "defaultvalue": 0,
          "displayName": "Bombs Planted"
        },
        {
          "name": "total_defused_bombs",
          "defaultvalue": 0,
          "displayName": "Bombs Defused"
        },
        {
          "name": "total_wins",
          "defaultvalue": 0,
          "displayName": "Rounds Won"
        },
        {
          "name": "total_damage_done",
          "defaultvalue": 0,
          "displayName": "Damage Done to Enemies"
        },
        {
          "name": "total_money_earned",
          "defaultvalue": 0,
          "displayName": "Money Earned"
        },
        {
          "name": "total_rescued_hostages",
          "defaultvalue": 0,
          "displayName": "Hostages Rescued"
        },
        {
          "name": "total_kills_knife",
          "defaultvalue": 0,
          "displayName": "Knife Kills"
        },
        {
          "name": "total_kills_hegrenade",
          "defaultvalue": 0,
          "displayName": "HE Grenade Kills"
        },
        {
          "name": "total_kills_glock",
          "defaultvalue": 0,
          "displayName": "9x19 Sidearm Kills"
        },
        {
          "name": "total_kills_deagle",
          "defaultvalue": 0,
          "displayName": "Desert Eagle .50c Kills"
        },
        {
          "name": "total_kills_elite",
          "defaultvalue": 0,
          "displayName": ".40 Dual Elites Kills"
        },
        {
          "name": "total_kills_fiveseven",
          "defaultvalue": 0,
          "displayName": "ES Five-Seven Kills"
        },
        {
          "name": "total_kills_xm1014",
          "defaultvalue": 0,
          "displayName": "XM1014 Kills"
        },
        {
          "name": "total_kills_mac10",
          "defaultvalue": 0,
          "displayName": "Ingram Mac-10 Kills"
        },
        {
          "name": "total_kills_ump45",
          "defaultvalue": 0,
          "displayName": "KM UMP45 Kills"
        },
        {
          "name": "total_kills_p90",
          "defaultvalue": 0,
          "displayName": "ES C90 Kills"
        },
        {
          "name": "total_kills_awp",
          "defaultvalue": 0,
          "displayName": "Magnum Sniper Rifle Kills"
        },
        {
          "name": "total_kills_ak47",
          "defaultvalue": 0,
          "displayName": "CV-47 Kills"
        },
        {
          "name": "total_kills_aug",
          "defaultvalue": 0,
          "displayN
... (truncated)
```

</details>

---

## IPlayerService

### 获取所有游戏及游玩时长

**接口**: `IPlayerService/GetOwnedGames/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "game_count": 172,
    "games": [
      {
        "appid": 10,
        "name": "Counter-Strike",
        "playtime_forever": 0,
        "img_icon_url": "6b0312cda02f5f777efa2f3318c307ff9acafbb5",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 20,
        "name": "Team Fortress Classic",
        "playtime_forever": 0,
        "img_icon_url": "38ea7ebe3c1abbbbf4eabdbef174c41a972102b9",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 30,
        "name": "Day of Defeat",
        "playtime_forever": 0,
        "img_icon_url": "aadc0ce51ff6ba2042d633f8ec033b0de62091d0",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 40,
        "name": "Deathmatch Classic",
        "playtime_forever": 0,
        "img_icon_url": "c525f76c8bc7353db4fd74b128c4ae2028426c2a",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "playtime_disconnected": 0
      },
      {
        "appid": 50,
        "name": "Half-Life: Opposing Force",
        "playtime_forever": 0,
        "img_icon_url": "04e81206c10e12416908c72c5f22aad411b3aeef",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 60,
        "name": "Ricochet",
        "playtime_forever": 0,
        "img_icon_url": "98c69e04cd59b838e05cb6980c12c05874c6419e",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "playtime_disconnected": 0
      },
      {
        "appid": 70,
        "name": "Half-Life",
        "playtime_forever": 0,
        "img_icon_url": "95be6d131fc61f145797317ca437c9765f24b41c",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
... (truncated)
```

</details>

### 获取近两周游玩记录

**接口**: `IPlayerService/GetRecentlyPlayedGames/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "total_count": 8,
    "games": [
      {
        "appid": 2213700,
        "name": "Sintopia",
        "playtime_2weeks": 2259,
        "playtime_forever": 2259,
        "img_icon_url": "1ee4cabe5b840bcaae56c1d40cb131f81e04c6ab",
        "playtime_windows_forever": 2259,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 365360,
        "name": "Battle Brothers",
        "playtime_2weeks": 1708,
        "playtime_forever": 1708,
        "img_icon_url": "b99db2c64ea125ff01c2d31583ff560a834e999c",
        "playtime_windows_forever": 1708,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 3240220,
        "name": "Grand Theft Auto V Enhanced",
        "playtime_2weeks": 334,
        "playtime_forever": 334,
        "img_icon_url": "8355a7bbdb704f727bfba80ec56bc7228991338e",
        "playtime_windows_forever": 334,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 730,
        "name": "Counter-Strike 2",
        "playtime_2weeks": 276,
        "playtime_forever": 111406,
        "img_icon_url": "8dbc71957312bbd3baea65848b545be9eae2a355",
        "playtime_windows_forever": 110930,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 1172470,
        "name": "Apex Legends",
        "playtime_2weeks": 221,
        "playtime_forever": 31663,
        "img_icon_url": "8986dd626da56db5f3fe09bc1b8871739de8b00d",
        "playtime_windows_forever": 31663,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 3912710,
        "name": "War of Banners Demo",
        "playtime_2weeks": 70,
        "playtime_forever": 70,
        "img_icon_url": "21c2715a25fdc61d287e2e83465bf71608fea11b",
        "playtime_windows_forever": 70,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 1621690,
        "name": "Core Keeper",
        "playtime_2weeks": 46,
        "playtime_forever": 549,
        "img_icon_url": "53517a1b2eb22e22ac4a1f71c814209f1b84c063",
        "playtime_windows_forever": 549,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      },
      {
        "appid": 892970,
        "name": "Valheim",
        "playtime_2weeks": 1,
        "playtime_forever": 1147,
        "img_icon_url": "2f64c9a826e2c6cf3253fea4834c2e612db09143",
        "playtime_windows_forever": 1147,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0
      }
    ]
  }
}
```

</details>

### 获取Steam等级

**接口**: `IPlayerService/GetSteamLevel/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "player_level": 30
  }
}
```

</details>

### 获取徽章信息

**接口**: `IPlayerService/GetBadges/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "badges": [
      {
        "badgeid": 13,
        "level": 147,
        "completion_time": 1777093719,
        "xp": 379,
        "scarcity": 12456191
      },
      {
        "badgeid": 69,
        "level": 1,
        "completion_time": 1765980654,
        "xp": 50,
        "scarcity": 26376265
      },
      {
        "badgeid": 70,
        "level": 4,
        "completion_time": 1764222580,
        "xp": 100,
        "scarcity": 1963536
      },
      {
        "badgeid": 68,
        "level": 1,
        "completion_time": 1739610471,
        "xp": 50,
        "scarcity": 36607984
      },
      {
        "badgeid": 66,
        "level": 1,
        "completion_time": 1702951119,
        "xp": 50,
        "scarcity": 39670506
      },
      {
        "badgeid": 64,
        "level": 1,
        "completion_time": 1672241776,
        "xp": 50,
        "scarcity": 78925492
      },
      {
        "badgeid": 63,
        "level": 4,
        "completion_time": 1669179680,
        "xp": 100,
        "scarcity": 1347073
      },
      {
        "badgeid": 48,
        "level": 12,
        "completion_time": 1663325509,
        "xp": 120,
        "scarcity": 2280447
      },
      {
        "badgeid": 61,
        "level": 10,
        "completion_time": 1656038020,
        "xp": 250,
        "scarcity": 4479842
      },
      {
        "badgeid": 60,
        "level": 10,
        "completion_time": 1655713346,
        "xp": 100,
        "scarcity": 813746
      },
      {
        "badgeid": 2,
        "level": 3,
        "completion_time": 1655711430,
        "xp": 500,
        "scarcity": 11783377
      },
      {
        "badgeid": 49,
        "level": 1,
        "completion_time": 1655708727,
        "xp": 10,
        "scarcity": 24003093
      },
      {
        "badgeid": 21,
        "level": 1,
        "completion_time": 1632273205,
        "xp": 100,
        "scarcity": 31865551
      },
      {
        "badgeid": 1,
        "level": 9,
        "completion_time": 1486864037,
        "xp": 450,
        "scarcity": 114582981
      },
      {
        "badgeid": 1,
        "appid": 730,
        "level": 5,
        "completion_time": 1655719197,
        "xp": 500,
        "communityitemid": "20952527046",
        "border_color": 0,
        "scarcity": 9837058
      },
      {
        "badgeid": 1,
        "appid": 602960,
        "level": 1,
        "completion_time": 1655719300,
        "xp": 100,
        "communityitemid": "20953610472",
        "border_color": 0,
        "scarcity": 116174
      },
      {
        "badgeid": 1,
        "appid": 379430,
        "level": 5,
        "completion_time": 1655794530,
        "xp": 500,
        "communityitemid": "20978566186",
        "border_color": 0,
        "scarcity": 62874
      },
      {
        "badgeid": 1,
        "appid": 1262580,
        "level": 1,
        "completion_time": 1662432581,
        "xp": 100,
        "communityitemid": "21946298386",
        "border_color": 0,
 
... (truncated)
```

</details>

### 获取社区徽章进度

**接口**: `IPlayerService/GetCommunityBadgeProgress/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "quests": [
      {
        "questid": 115,
        "completed": true
      },
      {
        "questid": 128,
        "completed": true
      },
      {
        "questid": 134,
        "completed": true
      },
      {
        "questid": 133,
        "completed": true
      },
      {
        "questid": 132,
        "completed": true
      },
      {
        "questid": 108,
        "completed": true
      },
      {
        "questid": 113,
        "completed": true
      },
      {
        "questid": 112,
        "completed": true
      },
      {
        "questid": 104,
        "completed": true
      },
      {
        "questid": 105,
        "completed": true
      },
      {
        "questid": 106,
        "completed": false
      },
      {
        "questid": 114,
        "completed": true
      },
      {
        "questid": 119,
        "completed": true
      },
      {
        "questid": 121,
        "completed": true
      },
      {
        "questid": 110,
        "completed": true
      },
      {
        "questid": 111,
        "completed": true
      },
      {
        "questid": 126,
        "completed": true
      },
      {
        "questid": 101,
        "completed": true
      },
      {
        "questid": 103,
        "completed": true
      },
      {
        "questid": 118,
        "completed": true
      },
      {
        "questid": 117,
        "completed": true
      },
      {
        "questid": 109,
        "completed": true
      },
      {
        "questid": 124,
        "completed": true
      },
      {
        "questid": 127,
        "completed": true
      },
      {
        "questid": 125,
        "completed": true
      },
      {
        "questid": 123,
        "completed": true
      },
      {
        "questid": 120,
        "completed": true
      },
      {
        "questid": 122,
        "completed": true
      }
    ]
  }
}
```

</details>

### 检查是否为共享游戏 (CS2)

**接口**: `IPlayerService/IsPlayingSharedGame/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {}
}
```

</details>

---

## ISteamNews

### 获取游戏新闻 (CS2)

**接口**: `ISteamNews/GetNewsForApp/v2`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "appnews": {
    "appid": 730,
    "newsitems": [
      {
        "gid": "1830797770237569",
        "title": "Counter-Strike 2 Update",
        "url": "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1830797770237569",
        "is_external_url": true,
        "author": "jo",
        "contents": "\\Fixed XM1014 shells flickering when starting a reload.Fixed bugs with dual berettas in first person and in spectator mode.Fixed inspect/cancel causing multiple worldmodel deploys.Fixed a bug where pl...",
        "feedlabel": "Community Announcements",
        "date": 1777070708,
        "feedname": "steam_community_announcements",
        "feed_type": 1,
        "appid": 730,
        "tags": [
          "patchnotes"
        ]
      },
      {
        "gid": "1830797770231786",
        "title": "Counter-Strike 2 Update",
        "url": "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1830797770231786",
        "is_external_url": true,
        "author": "jo",
        "contents": "\\Adjusted ground smoothing at locations where the player can stand on very thin ledges.\\Minor adjustments to viewmodel animations.\\Corrected some improper character texture assignments.Trade offers co...",
        "feedlabel": "Community Announcements",
        "date": 1776897651,
        "feedname": "steam_community_announcements",
        "feed_type": 1,
        "appid": 730,
        "tags": [
          "patchnotes"
        ]
      },
      {
        "gid": "1830797770229332",
        "title": "Counter-Strike 2 Update",
        "url": "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1830797770229332",
        "is_external_url": true,
        "author": "jo",
        "contents": "\\Adjusted camera motion due to recoil to match CS:GO more closely. Bullet trajectories should continue to match CS2.Players will now experience the full camera motion due to external sources of aim pu...",
        "feedlabel": "Community Announcements",
        "date": 1776810660,
        "feedname": "steam_community_announcements",
        "feed_type": 1,
        "appid": 730,
        "tags": [
          "patchnotes"
        ]
      }
    ],
    "count": 1723
  }
}
```

</details>

---

## ISteamApps

### 查询IP上的服务器

**接口**: `ISteamApps/GetServersAtAddress/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "success": true,
    "servers": []
  }
}
```

</details>

### 检查游戏版本是否最新 (CS2)

**接口**: `ISteamApps/UpToDateCheck/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Required parameter 'version' is missing</body></html>"
```

</details>

---

## ISteamEconomy

### 获取物品价格 (CS2)

**接口**: `ISteamEconomy/GetAssetPrices/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "success": true,
    "assets": [
      {
        "prices": {
          "USD": 199,
          "GBP": 148,
          "EUR": 175,
          "RUB": 15200,
          "BRL": 1049,
          "Unknown": 0,
          "JPY": 31000,
          "NOK": 2000,
          "IDR": 3249900,
          "MYR": 775,
          "PHP": 11900,
          "SGD": 265,
          "THB": 6500,
          "VND": 5300000,
          "KRW": 295000,
          "TRY": 0,
          "UAH": 8700,
          "MXN": 3499,
          "CAD": 269,
          "AUD": 280,
          "NZD": 335,
          "PLN": 710,
          "CHF": 155,
          "AED": 750,
          "CLP": 176500,
          "CNY": 1400,
          "COP": 750000,
          "PEN": 675,
          "SAR": 750,
          "TWD": 6300,
          "HKD": 1560,
          "ZAR": 3279,
          "INR": 18200,
          "ARS": 0,
          "CRC": 96000,
          "ILS": 650,
          "KWD": 60,
          "QAR": 729,
          "UYU": 7700,
          "KZT": 98000,
          "BYN": 0
        },
        "name": "1200",
        "date": "2013/08/28",
        "class": [
          {
            "name": "def_index",
            "value": "1200"
          }
        ],
        "classid": "191923205"
      },
      {
        "prices": {
          "USD": 199,
          "GBP": 148,
          "EUR": 175,
          "RUB": 15200,
          "BRL": 1049,
          "Unknown": 0,
          "JPY": 31000,
          "NOK": 2000,
          "IDR": 3249900,
          "MYR": 775,
          "PHP": 11900,
          "SGD": 265,
          "THB": 6500,
          "VND": 5300000,
          "KRW": 295000,
          "TRY": 0,
          "UAH": 8700,
          "MXN": 3499,
          "CAD": 269,
          "AUD": 280,
          "NZD": 335,
          "PLN": 710,
          "CHF": 155,
          "AED": 750,
          "CLP": 176500,
          "CNY": 1400,
          "COP": 750000,
          "PEN": 675,
          "SAR": 750,
          "TWD": 6300,
          "HKD": 1560,
          "ZAR": 3279,
          "INR": 18200,
          "ARS": 0,
          "CRC": 96000,
          "ILS": 650,
          "KWD": 60,
          "QAR": 729,
          "UYU": 7700,
          "KZT": 98000,
          "BYN": 0
        },
        "name": "1201",
        "date": "2019/11/25",
        "class": [
          {
            "name": "def_index",
            "value": "1201"
          }
        ],
        "classid": "3604678661"
      },
      {
        "prices": {
          "USD": 249,
          "GBP": 185,
          "EUR": 219,
          "RUB": 19100,
          "BRL": 1325,
          "Unknown": 0,
          "JPY": 38500,
          "NOK": 2500,
          "IDR": 4059900,
          "MYR": 975,
          "PHP": 14800,
          "SGD": 330,
          "THB": 8100,
          "VND": 6600000,
          "KRW": 369000,
          "TRY": 0,
          "UAH": 10800,
          "MXN": 4399,
          "CAD": 339,
          "AUD": 355,
          "NZD": 415,
          "PLN": 890,
          "CHF": 190,
          "AED": 925,
 
... (truncated)
```

</details>

### 获取物品类别信息 (CS2)

**接口**: `ISteamEconomy/GetAssetClassInfo/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Required parameter 'classid0' is missing</body></html>"
```

</details>

---

## IEconService

### 获取交易报价列表

**接口**: `IEconService/GetTradeOffers/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "next_cursor": 0
  }
}
```

</details>

### 获取交易报价摘要

**接口**: `IEconService/GetTradeOffersSummary/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "pending_received_count": 0,
    "new_received_count": 0,
    "updated_received_count": 0,
    "historical_received_count": 0,
    "pending_sent_count": 0,
    "newly_accepted_sent_count": 0,
    "updated_sent_count": 0,
    "historical_sent_count": 0,
    "escrow_received_count": 0,
    "escrow_sent_count": 0
  }
}
```

</details>

### 获取交易历史

**接口**: `IEconService/GetTradeHistory/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "more": true,
    "trades": [
      {
        "tradeid": "729157067630530053",
        "steamid_other": "76561199678517636",
        "time_init": 1772442302,
        "status": 3,
        "time_settlement": 1773126000
      }
    ]
  }
}
```

</details>

---

## IWishlistService

### 获取愿望单

**接口**: `IWishlistService/GetWishlist/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "items": [
      {
        "appid": 301280,
        "priority": 0,
        "date_added": 1775631850
      },
      {
        "appid": 505230,
        "priority": 0,
        "date_added": 1742910614
      },
      {
        "appid": 538030,
        "priority": 0,
        "date_added": 1775188961
      },
      {
        "appid": 673610,
        "priority": 0,
        "date_added": 1730349418
      },
      {
        "appid": 726840,
        "priority": 0,
        "date_added": 1758180711
      },
      {
        "appid": 812140,
        "priority": 0,
        "date_added": 1732902533
      },
      {
        "appid": 895400,
        "priority": 0,
        "date_added": 1733673413
      },
      {
        "appid": 917150,
        "priority": 0,
        "date_added": 1731901054
      },
      {
        "appid": 940710,
        "priority": 0,
        "date_added": 1713887278
      },
      {
        "appid": 951820,
        "priority": 0,
        "date_added": 1691927058
      },
      {
        "appid": 1164940,
        "priority": 0,
        "date_added": 1713541026
      },
      {
        "appid": 1266840,
        "priority": 0,
        "date_added": 1709185222
      },
      {
        "appid": 1282730,
        "priority": 0,
        "date_added": 1711897750
      },
      {
        "appid": 1330430,
        "priority": 0,
        "date_added": 1765031549
      },
      {
        "appid": 1375750,
        "priority": 0,
        "date_added": 1777141748
      },
      {
        "appid": 1390010,
        "priority": 0,
        "date_added": 1718209912
      },
      {
        "appid": 1455910,
        "priority": 0,
        "date_added": 1704944056
      },
      {
        "appid": 1501690,
        "priority": 0,
        "date_added": 1712503666
      },
      {
        "appid": 1571440,
        "priority": 0,
        "date_added": 1730124609
      },
      {
        "appid": 1585180,
        "priority": 0,
        "date_added": 1729492546
      },
      {
        "appid": 1605220,
        "priority": 0,
        "date_added": 1723021108
      },
      {
        "appid": 1608640,
        "priority": 0,
        "date_added": 1677909006
      },
      {
        "appid": 1676130,
        "priority": 0,
        "date_added": 1722146365
      },
      {
        "appid": 1693980,
        "priority": 0,
        "date_added": 1675081840
      },
      {
        "appid": 1702010,
        "priority": 0,
        "date_added": 1689080471
      },
      {
        "appid": 1708850,
        "priority": 0,
        "date_added": 1723021279
      },
      {
        "appid": 1724770,
        "priority": 0,
        "date_added": 1722310495
      },
      {
        "appid": 1733110,
        "priority": 0,
        "date_added": 1760609180
      },
      {
        "appid": 1812450,
        "priority": 0,
        "date_added": 1714024187
      },
      {
        "appid": 1822550,
        "priority": 0,
        "date_added": 1692369133
      },
      {
... (truncated)
```

</details>

### 获取愿望单数量

**接口**: `IWishlistService/GetWishlistItemCount/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "count": 62
  }
}
```

</details>

---

## IStoreService

### 获取关注的游戏

**接口**: `IStoreService/GetGamesFollowed/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Missing required routing parameter</body></html>"
```

</details>

### 获取关注的游戏数量

**接口**: `IStoreService/GetGamesFollowedCount/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Missing required routing parameter</body></html>"
```

</details>

### 获取推荐标签

**接口**: `IStoreService/GetRecommendedTagsForUser/v1`  
**状态码**: `401`

<details><summary>返回数据</summary>

```json
"<html><head><title>Unauthorized</title></head><body><h1>Unauthorized</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"
```

</details>

---

## IPublishedFileService

### 获取用户的创意工坊文件

**接口**: `IPublishedFileService/GetUserFiles/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "total": 9,
    "startindex": 1,
    "publishedfiledetails": [
      {
        "result": 1,
        "publishedfileid": "2863985395",
        "creator": "76561198367786896",
        "creator_appid": 431960,
        "consumer_appid": 431960,
        "consumer_shortcutid": 0,
        "filename": "",
        "file_size": "523447204",
        "preview_file_size": "342785",
        "preview_url": "https://images.steamusercontent.com/ugc/1830173118462756187/2A6143F5D9685E7E2F4DA03332B8BD9932A6ED2E/",
        "url": "",
        "hcontent_file": "7162398792635874947",
        "hcontent_preview": "1830173118462756187",
        "title": "天国拯救高燃混剪：𝕶𝖎𝖓𝖌𝖉𝖔𝖒𝕮𝖔𝖒𝖊",
        "short_description": "𝕶𝖎𝖓𝖌𝖉𝖔𝖒𝕮𝖔𝖒𝖊:𝕯𝖊𝖑𝖎𝖛𝖊𝖗𝖆𝖓𝖈𝖊 𝖆𝖑𝖜𝖆𝖞𝖘 𝖇𝖊 𝖒𝖞 𝖋𝖆𝖛𝖔𝖚𝖗𝖎𝖙𝖊!!",
        "time_created": 1663401266,
        "time_updated": 1663406565,
        "visibility": 0,
        "flags": 5632,
        "workshop_file": false,
        "workshop_accepted": false,
        "show_subscribe_all": false,
        "num_comments_developer": 0,
        "num_comments_public": 2,
        "banned": false,
        "ban_reason": "",
        "banner": "76561197960265728",
        "can_be_deleted": true,
        "app_name": "Wallpaper Engine",
        "file_type": 0,
        "can_subscribe": true,
        "subscriptions": 248,
        "favorited": 26,
        "followers": 0,
        "lifetime_subscriptions": 923,
        "lifetime_favorited": 37,
        "lifetime_followers": 0,
        "lifetime_playtime": "0",
        "lifetime_playtime_sessions": "0",
        "views": 80,
        "num_children": 0,
        "num_reports": 0,
        "tags": [
          {
            "tag": "Wallpaper",
            "display_name": "Wallpaper"
          },
          {
            "tag": "Video",
            "display_name": "Video"
          },
          {
            "tag": "Medieval",
            "display_name": "Medieval"
          },
          {
            "tag": "1920 x 1080",
            "display_name": "1920 x 1080"
          },
          {
            "tag": "Everyone",
            "display_name": "Everyone"
          }
        ],
        "kvtags": [
          {
            "key": "Width",
            "value": "1920"
          },
          {
            "key": "Height",
            "value": "1080"
          },
          {
            "key": "version",
            "value": "20000100000032"
          },
          {
            "key": "fhash",
            "value": "a52e079276eb"
          },
          {
            "key": "fhash2",
            "value": "5901cacbd5cf"
          },
          {
            "key": "app_workshop_eula_version",
            "value": "3"
          },
          {
            "key": "fhash3",
            "value": "ed36815be2ab"
          },
          {
            "key": "fhash4",
            "value": "f98491c9cca2"
          },
          {
            "key": "fhash5",
            "value": "1634830503"
          }
        ],
        "vote_data": {
          "score": 0.5614035129
... (truncated)
```

</details>

### 获取用户创意工坊文件数量

**接口**: `IPublishedFileService/GetUserFileCount/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {}
}
```

</details>

### 获取用户投票摘要

**接口**: `IPublishedFileService/GetUserVoteSummary/v1`  
**状态码**: `401`

<details><summary>返回数据</summary>

```json
"<html><head><title>Unauthorized</title></head><body><h1>Unauthorized</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"
```

</details>

---

## ISteamRemoteStorage

### 获取UGC文件详情

**接口**: `ISteamRemoteStorage/GetUGCFileDetails/v1`  
**状态码**: `404`

<details><summary>返回数据</summary>

```json
{
  "status": {
    "code": 9
  }
}
```

</details>

---

## ISteamDirectory

### 获取连接管理器列表

**接口**: `ISteamDirectory/GetCMList/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "serverlist": [
      "103.10.124.123:27017",
      "103.10.124.124:27017",
      "103.10.124.122:27017",
      "103.10.124.125:27017",
      "103.28.54.169:27017",
      "103.28.54.185:27017",
      "103.28.54.173:27017",
      "103.28.54.171:27017",
      "103.28.54.187:27017",
      "103.28.54.162:27017",
      "103.28.54.181:27017",
      "103.28.54.178:27017",
      "103.28.54.165:27017",
      "45.121.184.23:27017",
      "45.121.184.21:27017",
      "45.121.184.22:27017",
      "45.121.184.20:27017",
      "162.254.195.71:27017",
      "162.254.195.66:27017",
      "155.133.225.20:27017",
      "205.196.6.134:27017",
      "155.133.225.21:27017",
      "162.254.194.52:27017",
      "162.254.194.36:27017",
      "162.254.193.102:27017",
      "162.254.193.74:27017",
      "205.196.6.148:27017",
      "103.10.125.24:27017",
      "103.10.125.42:27017",
      "162.254.199.163:27017",
      "162.254.199.181:27017",
      "162.254.192.100:27017",
      "162.254.192.101:27017",
      "155.133.224.23:27017",
      "155.133.224.22:27017",
      "185.25.183.36:27017",
      "185.25.183.52:27017",
      "162.254.196.67:27017",
      "162.254.196.83:27017",
      "162.254.196.68:27017",
      "162.254.196.84:27017",
      "185.25.182.52:27017",
      "185.25.182.20:27017",
      "155.133.248.39:27017",
      "155.133.248.38:27017",
      "146.66.152.43:27017",
      "146.66.152.44:27017",
      "146.66.152.38:27017",
      "146.66.152.39:27017",
      "162.254.197.40:27017",
      "162.254.197.38:27017",
      "155.133.226.74:27017",
      "155.133.226.76:27017",
      "155.133.226.75:27017",
      "162.254.197.54:27017",
      "155.133.226.78:27017",
      "162.254.197.39:27017",
      "155.133.246.51:27017",
      "155.133.246.35:27017",
      "155.133.252.54:27017",
      "155.133.252.40:27017",
      "155.133.252.39:27017",
      "162.254.198.44:27017",
      "162.254.198.46:27017",
      "162.254.198.104:27017",
      "146.66.155.38:27017",
      "146.66.155.54:27017",
      "155.133.230.50:27017",
      "155.133.230.34:27017",
      "155.133.227.39:27017",
      "155.133.227.55:27017",
      "155.133.227.50:27017",
      "155.133.227.34:27017",
      "155.133.255.164:27017",
      "155.133.255.100:27017",
      "155.133.238.195:27017",
      "155.133.238.179:27017",
      "155.133.249.180:27017",
      "155.133.249.164:27017",
      "155.133.244.34:27017",
      "155.133.244.50:27017"
    ],
    "serverlist_websockets": [
      "cmp1-sgp1.steamserver.net:27019",
      "cmp1-sgp1.steamserver.net:27019",
      "cmp1-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp1-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp1-sgp1.steamserver.net:27019",
      "cmp2-sgp1.steamserver.net:27019",
      "cmp2-sgp1.s
... (truncated)
```

</details>

### 获取CM连接信息

**接口**: `ISteamDirectory/GetCMListForConnect/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "serverlist": [
      {
        "endpoint": "cmp1-sgp1.steamserver.net:443",
        "legacy_endpoint": "cmp2-sgp1.steamserver.net:443",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 12.338743209838867
      },
      {
        "endpoint": "cmp1-sgp1.steamserver.net:443",
        "legacy_endpoint": "cmp1-sgp1.steamserver.net:443",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 12.863533020019531
      },
      {
        "endpoint": "cmp1-sgp1.steamserver.net:27019",
        "legacy_endpoint": "cmp2-sgp1.steamserver.net:27019",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 22,
        "wtd_load": 15.767625331878662
      },
      {
        "endpoint": "cmp1-sgp1.steamserver.net:443",
        "legacy_endpoint": "cmp2-sgp1.steamserver.net:443",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 15.84306001663208
      },
      {
        "endpoint": "cmp2-sgp1.steamserver.net:27018",
        "legacy_endpoint": "cmp2-sgp1.steamserver.net:27018",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 16.702985763549805
      },
      {
        "endpoint": "cmp1-sgp1.steamserver.net:443",
        "legacy_endpoint": "cmp2-sgp1.steamserver.net:443",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 17.104493618011475
      },
      {
        "endpoint": "cmp1-hkg1.steamserver.net:27018",
        "legacy_endpoint": "cmp2-hkg1.steamserver.net:27018",
        "type": "websockets",
        "dc": "hkg1",
        "realm": "steamglobal",
        "load": 21,
        "wtd_load": 17.190778255462646
      },
      {
        "endpoint": "103.10.124.123:27017",
        "legacy_endpoint": "103.10.124.123:27017",
        "type": "netfilter",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 22,
        "wtd_load": 17.50709342956543
      },
      {
        "endpoint": "cmp2-sgp1.steamserver.net:27020",
        "legacy_endpoint": "cmp1-sgp1.steamserver.net:27020",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 24,
        "wtd_load": 17.952311038970947
      },
      {
        "endpoint": "cmp1-sgp1.steamserver.net:27018",
        "legacy_endpoint": "cmp1-sgp1.steamserver.net:27018",
        "type": "websockets",
        "dc": "sgp1",
        "realm": "steamglobal",
        "load": 23,
        "wtd_load": 18.184779167175293
      },
      {
        "endpoint": "cmp2-hkg1.steamserver.net:27025",
        "legacy_endpoint": "cmp1-hkg1.steamserver.net:27025",
        "type": "websockets",
        "dc": "hkg1",
        "realm": "steamglobal",
        "load": 19,
    
... (truncated)
```

</details>

### 获取SteamPipe域名

**接口**: `ISteamDirectory/GetSteamPipeDomains/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "domainlist": [
      "*.steamcontent.com",
      "cs.steampowered.com",
      "alibaba.cdn.steampipe.steamcontent.com",
      "broadcast.st.dl.eccdnx.com",
      "cdn-ali.content.steamchina.com",
      "cdn-qc.content.steamchina.com",
      "cdn-ws.content.steamchina.com",
      "d1i7ostkhjru8n.cloudfront.net",
      "dl.steam.clngaa.com",
      "edge.steam-dns.top.comcast.net",
      "edgenext.cdn.steampipe.steamcontent.com",
      "fastly-partner.cdn.steampipe.steamcontent.com",
      "fastly.cdn.steampipe.steamcontent.com",
      "google.cdn.steampipe.steamcontent.com",
      "google2.cdn.steampipe.steamcontent.com",
      "google3.cdn.steampipe.steamcontent.com",
      "lv.queniujq.cn",
      "st.dl.eccdnx.com",
      "steam.cdn.on.net",
      "steam.cdn.webra.ru",
      "steambroadcast-test.akamaized.net",
      "steambroadcast.akamaized.net",
      "steambroadcastchat.akamaized.net",
      "steampipe-kr.akamaized.net",
      "steampipe-origin-tier2.steamcontent.com",
      "steampipe-partner.akamaized.net",
      "steampipe-sc.akamaized.net",
      "steampipe-tr.akamaized.net",
      "steampipe.akamaized.net",
      "telus.cdn.steampipe.steamcontent.com",
      "xz.pphimalayanrt.com"
    ],
    "result": 1,
    "message": ""
  }
}
```

</details>

---

## IGameServersService

### 获取游戏服务器账号列表

**接口**: `IGameServersService/GetAccountList/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "is_banned": false,
    "expires": 0,
    "actor": "76561197960265728",
    "last_action_time": 0
  }
}
```

</details>

---

## IEconItems_730

### 获取CS2玩家物品

**接口**: `IEconItems_730/GetPlayerItems/v1`  
**状态码**: `410`

<details><summary>返回数据</summary>

```json
"<html>\n<head>\n<title>410 Gone</title>\n</head>\n<body>\n<h1>Gone</h1>\n</body>\n</html>"
```

</details>

### 获取CS2物品Schema

**接口**: `IEconItems_730/GetSchema/v2`  
**状态码**: `410`

<details><summary>返回数据</summary>

```json
"<html>\n<head>\n<title>410 Gone</title>\n</head>\n<body>\n<h1>Gone</h1>\n</body>\n</html>"
```

</details>

### 获取CS2 Schema URL

**接口**: `IEconItems_730/GetSchemaURL/v2`  
**状态码**: `410`

<details><summary>返回数据</summary>

```json
"<html>\n<head>\n<title>410 Gone</title>\n</head>\n<body>\n<h1>Gone</h1>\n</body>\n</html>"
```

</details>

### 获取CS2商店元数据

**接口**: `IEconItems_730/GetStoreMetaData/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "tabs": [
      {
        "label": "HOME",
        "id": "1909853392",
        "parent_id": 0,
        "default": true,
        "tab_image_override_name": "",
        "children": [],
        "home": true
      },
      {
        "label": "WEARABLES",
        "id": "618468259",
        "parent_id": 0,
        "default": false,
        "tab_image_override_name": "",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "WEAPONS",
        "id": "1376697313",
        "parent_id": 0,
        "default": false,
        "tab_image_override_name": "",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "MISC",
        "id": "2141657786",
        "parent_id": 0,
        "default": false,
        "tab_image_override_name": "",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "BUNDLES",
        "id": "2776314621",
        "parent_id": 0,
        "default": false,
        "tab_image_override_name": "",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 464088892
      }
    ],
    "filters": [
      {
        "id": 1468829639,
        "name": "heroes",
        "url_history_param_name": "h",
        "all_element": {
          "id": 991457757,
          "localized_text": "#Store_Filter_All"
        },
        "elements": [
          {
            "name": "all",
            "localized_text": "#Store_Filter_All",
            "id": 991457757
          }
        ],
        "count": 1
      },
      {
        "id": 1939313376,
        "name": "item_types",
        "url_history_param_name": "t",
        "all_element": {
          "id": 991457757,
          "localized_text": "#Store_Filter_All"
        },
        "elements": [
          {
            "name": "all",
            "localized_text": "#Store_Filter_All",
            "id": 991457757
          }
        ],
        "count": 1
      },
      {
        "id": 109301539,
        "name": "rarities",
        "url_history_param_name": "r",
        "all_element": {
          "id": 991457757,
          "localized_text": "#Store_Filter_All"
        },
        "elements": [
          {
            "name": "all",
            "localized_text": "#Store_Filter_All",
            "id": 991457757
          }
        ],
        "count": 1
      }
    ],
    "sorting": {
      "sorters": [
        {
          "id": 4152509351,
          "name": "release_newest",
          "data_type": "date",
          "sort_field": "released",
          "sort_reversed": false,
          "localized_text": "#Store_Sorter_ReleaseNewest"
        },
        {
          "id": 1935804930,
          "name": "release_oldest",
          "data_type": "date",
          "sort_field": "released",
          "sort_reversed": true,
          "localized_text": "#Store_Sorter_ReleaseOldest"
        },
        {

... (truncated)
```

</details>

---

## IGCVersion_730

### 获取CS2 GC服务器版本

**接口**: `IGCVersion_730/GetServerVersion/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "success": true,
    "deploy_version": 0,
    "active_version": 0,
    "response_time": 1777303925
  }
}
```

</details>

---

## ICSGOServers_730

### 获取CS2服务器状态

**接口**: `ICSGOServers_730/GetGameServersStatus/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "app": {
      "version": 14155,
      "timestamp": 1777303865,
      "time": "Mon Apr 27 08:31:05 2026"
    },
    "services": {
      "SessionsLogon": "normal",
      "SteamCommunity": "normal",
      "IEconItems": "offline",
      "Leaderboards": "idle"
    },
    "datacenters": {
      "Peru": {
        "capacity": "full",
        "load": "low"
      },
      "EU Frankfurt": {
        "capacity": "full",
        "load": "high"
      },
      "EU Vienna": {
        "capacity": "full",
        "load": "medium"
      },
      "EU Warsaw": {
        "capacity": "full",
        "load": "low"
      },
      "Hong Kong": {
        "capacity": "full",
        "load": "low"
      },
      "EU Madrid": {
        "capacity": "full",
        "load": "low"
      },
      "Chile": {
        "capacity": "full",
        "load": "low"
      },
      "US California": {
        "capacity": "full",
        "load": "idle"
      },
      "US Atlanta": {
        "capacity": "full",
        "load": "low"
      },
      "China Guangdong": {
        "capacity": "full",
        "load": "low"
      },
      "EU Stockholm": {
        "capacity": "full",
        "load": "medium"
      },
      "Emirates": {
        "capacity": "full",
        "load": "low"
      },
      "US Seattle": {
        "capacity": "full",
        "load": "idle"
      },
      "South Africa": {
        "capacity": "full",
        "load": "low"
      },
      "Brazil": {
        "capacity": "full",
        "load": "low"
      },
      "US Virginia": {
        "capacity": "full",
        "load": "low"
      },
      "US Chicago": {
        "capacity": "full",
        "load": "idle"
      },
      "Japan": {
        "capacity": "full",
        "load": "low"
      },
      "China Pudong": {
        "capacity": "full",
        "load": "low"
      },
      "EU Helsinki": {
        "capacity": "full",
        "load": "idle"
      },
      "EU Falkenstein": {
        "capacity": "full",
        "load": "idle"
      },
      "India Mumbai": {
        "capacity": "full",
        "load": "low"
      },
      "India Chennai": {
        "capacity": "full",
        "load": "low"
      },
      "US Dallas": {
        "capacity": "full",
        "load": "low"
      },
      "Argentina": {
        "capacity": "full",
        "load": "low"
      },
      "South Korea": {
        "capacity": "full",
        "load": "low"
      },
      "United Kingdom": {
        "capacity": "high",
        "load": "medium"
      },
      "Singapore": {
        "capacity": "full",
        "load": "high"
      },
      "Australia": {
        "capacity": "full",
        "load": "low"
      },
      "China Beijing": {
        "capacity": "full",
        "load": "low"
      },
      "China Chengdu": {
        "capacity": "full",
        "load": "low"
      }
    },
    "matchmaking": {
      "scheduler": "normal",
      "online_servers": 262071,
      "online_players": 1026964,
      "searching_players": 15504,
     
... (truncated)
```

</details>

### 获取CS2地图游玩时间统计

**接口**: `ICSGOServers_730/GetGameMapsPlaytime/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Required parameter 'gamemode' is missing</body></html>"
```

</details>

---

## ICSGOPlayers_730

### 获取下一场比赛分享码 (CS2)

**接口**: `ICSGOPlayers_730/GetNextMatchSharingCode/v1`  
**状态码**: `403`

<details><summary>返回数据</summary>

```json
{}
```

</details>

---

## IDOTA2Match_570

### 获取Dota2比赛历史

**接口**: `IDOTA2Match_570/GetMatchHistory/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "status": 1,
    "num_results": 3,
    "total_results": 500,
    "results_remaining": 497,
    "matches": [
      {
        "match_id": 8788721737,
        "match_seq_num": 7386325306,
        "start_time": 1777303872,
        "lobby_type": 14,
        "radiant_team_id": 0,
        "dire_team_id": 0,
        "players": [
          {
            "account_id": 1616141456,
            "player_slot": 0,
            "team_number": 0,
            "team_slot": 0,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "account_id": 4294967295,
            "player_slot": 1,
            "team_number": 0,
            "team_slot": 1,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 2,
            "team_number": 0,
            "team_slot": 2,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 3,
            "team_number": 0,
            "team_slot": 3,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 4,
            "team_number": 0,
            "team_slot": 4,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 128,
            "team_number": 1,
            "team_slot": 0,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 129,
            "team_number": 1,
            "team_slot": 1,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 130,
            "team_number": 1,
            "team_slot": 2,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 131,
            "team_number": 1,
            "team_slot": 3,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 132,
            "team_number": 1,
            "team_slot": 4,
            "hero_id": 0,
            "hero_variant": 0
          }
        ]
      },
      {
        "match_id": 8788721636,
        "match_seq_num": 7386325324,
        "start_time": 1777303868,
        "lobby_type": 14,
        "radiant_team_id": 0,
        "dire_team_id": 0,
        "players": [
          {
            "account_id": 750775165,
            "player_slot": 0,
            "team_number": 0,
            "team_slot": 0,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 1,
            "team_number": 0,
            "team_slot": 1,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 2,
            "team_number": 0,
            "team_slot": 2,
            "hero_id": 0,
            "hero_variant": 0
          },
          {
            "player_slot": 3,
            "team_number": 0,
            "team_slot": 3,
    
... (truncated)
```

</details>

### 获取Dota2热门直播比赛

**接口**: `IDOTA2Match_570/GetTopLiveGame/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Required parameter 'partner' is missing</body></html>"
```

</details>

### 获取Dota2联赛直播

**接口**: `IDOTA2Match_570/GetLiveLeagueGames/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "games": [
      {
        "players": [
          {
            "account_id": 143175881,
            "name": "大大狗下士",
            "hero_id": 120,
            "team": 1
          },
          {
            "account_id": 185693787,
            "name": "TGA宇宙机器人皇",
            "hero_id": 75,
            "team": 1
          },
          {
            "account_id": 177410152,
            "name": "纯爱战神",
            "hero_id": 67,
            "team": 1
          },
          {
            "account_id": 171153216,
            "name": "QAQ",
            "hero_id": 138,
            "team": 0
          },
          {
            "account_id": 1520937395,
            "name": "danewnew",
            "hero_id": 123,
            "team": 1
          },
          {
            "account_id": 163185878,
            "name": "K",
            "hero_id": 108,
            "team": 1
          },
          {
            "account_id": 255290040,
            "name": "Black beer",
            "hero_id": 15,
            "team": 0
          },
          {
            "account_id": 472477125,
            "name": "别接箭了秋梨膏",
            "hero_id": 131,
            "team": 0
          },
          {
            "account_id": 383857296,
            "name": "Harmony Joy Yard",
            "hero_id": 110,
            "team": 0
          },
          {
            "account_id": 182434464,
            "name": "Zzzzz     ^",
            "hero_id": 126,
            "team": 0
          },
          {
            "account_id": 4531584,
            "name": "吗喽五条悟",
            "hero_id": 0,
            "team": 2
          }
        ],
        "radiant_team": {
          "team_name": "死殺组",
          "team_id": 10088725,
          "team_logo": 17881201520994978452,
          "complete": false
        },
        "dire_team": {
          "team_name": "野狗冲锋队",
          "team_id": 10122439,
          "team_logo": 15531483737626877845,
          "complete": false
        },
        "lobby_id": 29812825105649028,
        "match_id": 8788686451,
        "spectators": 2,
        "league_id": 19479,
        "league_node_id": 0,
        "stream_delay_s": 10,
        "radiant_series_wins": 0,
        "dire_series_wins": 0,
        "series_type": 0,
        "scoreboard": {
          "duration": 821.8667602539062,
          "roshan_respawn_timer": 0,
          "radiant": {
            "score": 11,
            "tower_state": 2047,
            "barracks_state": 63,
            "picks": [
              {
                "hero_id": 110
              },
              {
                "hero_id": 131
              },
              {
                "hero_id": 126
              },
              {
                "hero_id": 138
              },
              {
                "hero_id": 15
              }
            ],
            "bans": [
              {
                "hero_id": 73
              },
              {
                "hero_id": 136
              },
              {
        
... (truncated)
```

</details>

---

## IEconDOTA2_570

### 获取Dota2英雄列表(中文)

**接口**: `IEconDOTA2_570/GetHeroes/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "heroes": [
      {
        "name": "npc_dota_hero_antimage",
        "id": 1,
        "localized_name": "Anti-Mage"
      },
      {
        "name": "npc_dota_hero_axe",
        "id": 2,
        "localized_name": "Axe"
      },
      {
        "name": "npc_dota_hero_bane",
        "id": 3,
        "localized_name": "Bane"
      },
      {
        "name": "npc_dota_hero_bloodseeker",
        "id": 4,
        "localized_name": "Bloodseeker"
      },
      {
        "name": "npc_dota_hero_crystal_maiden",
        "id": 5,
        "localized_name": "Crystal Maiden"
      },
      {
        "name": "npc_dota_hero_drow_ranger",
        "id": 6,
        "localized_name": "Drow Ranger"
      },
      {
        "name": "npc_dota_hero_earthshaker",
        "id": 7,
        "localized_name": "Earthshaker"
      },
      {
        "name": "npc_dota_hero_juggernaut",
        "id": 8,
        "localized_name": "Juggernaut"
      },
      {
        "name": "npc_dota_hero_mirana",
        "id": 9,
        "localized_name": "Mirana"
      },
      {
        "name": "npc_dota_hero_nevermore",
        "id": 11,
        "localized_name": "Shadow Fiend"
      },
      {
        "name": "npc_dota_hero_morphling",
        "id": 10,
        "localized_name": "Morphling"
      },
      {
        "name": "npc_dota_hero_phantom_lancer",
        "id": 12,
        "localized_name": "Phantom Lancer"
      },
      {
        "name": "npc_dota_hero_puck",
        "id": 13,
        "localized_name": "Puck"
      },
      {
        "name": "npc_dota_hero_pudge",
        "id": 14,
        "localized_name": "Pudge"
      },
      {
        "name": "npc_dota_hero_razor",
        "id": 15,
        "localized_name": "Razor"
      },
      {
        "name": "npc_dota_hero_sand_king",
        "id": 16,
        "localized_name": "Sand King"
      },
      {
        "name": "npc_dota_hero_storm_spirit",
        "id": 17,
        "localized_name": "Storm Spirit"
      },
      {
        "name": "npc_dota_hero_sven",
        "id": 18,
        "localized_name": "Sven"
      },
      {
        "name": "npc_dota_hero_tiny",
        "id": 19,
        "localized_name": "Tiny"
      },
      {
        "name": "npc_dota_hero_vengefulspirit",
        "id": 20,
        "localized_name": "Vengeful Spirit"
      },
      {
        "name": "npc_dota_hero_windrunner",
        "id": 21,
        "localized_name": "Windranger"
      },
      {
        "name": "npc_dota_hero_zuus",
        "id": 22,
        "localized_name": "Zeus"
      },
      {
        "name": "npc_dota_hero_kunkka",
        "id": 23,
        "localized_name": "Kunkka"
      },
      {
        "name": "npc_dota_hero_lina",
        "id": 25,
        "localized_name": "Lina"
      },
      {
        "name": "npc_dota_hero_lich",
        "id": 31,
        "localized_name": "Lich"
      },
      {
        "name": "npc_dota_hero_lion",
        "id": 26,
        "localized_name": "Lion"
      },
      {
        "name": "n
... (truncated)
```

</details>

### 获取Dota2物品稀有度(中文)

**接口**: `IEconDOTA2_570/GetRarities/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "count": 9,
    "rarities": [
      {
        "name": "common",
        "id": 1,
        "order": 0,
        "color": "#b0c3d9",
        "localized_name": "Common"
      },
      {
        "name": "uncommon",
        "id": 2,
        "order": 1,
        "color": "#5e98d9",
        "localized_name": "Uncommon"
      },
      {
        "name": "rare",
        "id": 3,
        "order": 2,
        "color": "#4b69ff",
        "localized_name": "Rare"
      },
      {
        "name": "mythical",
        "id": 4,
        "order": 3,
        "color": "#8847ff",
        "localized_name": "Mythical"
      },
      {
        "name": "legendary",
        "id": 5,
        "order": 4,
        "color": "#d32ce6",
        "localized_name": "Legendary"
      },
      {
        "name": "ancient",
        "id": 6,
        "order": 5,
        "color": "#EB4B4B",
        "localized_name": "Ancient"
      },
      {
        "name": "immortal",
        "id": 7,
        "order": 6,
        "color": "#e4ae39",
        "localized_name": "Immortal"
      },
      {
        "name": "arcana",
        "id": 8,
        "order": 7,
        "color": "#ADE55C",
        "localized_name": "Arcana"
      }
    ],
    "status": 200
  }
}
```

</details>

### 获取Dota2锦标赛奖金池

**接口**: `IEconDOTA2_570/GetTournamentPrizePool/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "prize_pool": 0,
    "league_id": 0,
    "status": 200
  }
}
```

</details>

---

## ITFItems_440

### 获取TF2金扳手列表

**接口**: `ITFItems_440/GetGoldenWrenches/v2`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "results": {
    "wrenches": [
      {
        "steamID": 76561197960446102,
        "timestamp": 1278294480,
        "itemID": 101444080,
        "wrenchNumber": 18
      },
      {
        "steamID": 76561197960465781,
        "timestamp": 1278294466,
        "itemID": 101444053,
        "wrenchNumber": 5
      },
      {
        "steamID": 76561197960668185,
        "timestamp": 1278423204,
        "itemID": 103997659,
        "wrenchNumber": 43
      },
      {
        "steamID": 76561197961132850,
        "timestamp": 1278510374,
        "itemID": 104990639,
        "wrenchNumber": 58
      },
      {
        "steamID": 76561197961724462,
        "timestamp": 1278351159,
        "itemID": 102461305,
        "wrenchNumber": 19
      },
      {
        "steamID": 76561197962107049,
        "timestamp": 1278512811,
        "itemID": 105021197,
        "wrenchNumber": 60
      },
      {
        "steamID": 76561197964923457,
        "timestamp": 1278631958,
        "itemID": 106532046,
        "wrenchNumber": 100
      },
      {
        "steamID": 76561197965479730,
        "timestamp": 1278421505,
        "itemID": 103980647,
        "wrenchNumber": 42
      },
      {
        "steamID": 76561197965729150,
        "timestamp": 1278294476,
        "itemID": 101444073,
        "wrenchNumber": 15
      },
      {
        "steamID": 76561197966460852,
        "timestamp": 1278557874,
        "itemID": 105593860,
        "wrenchNumber": 77
      },
      {
        "steamID": 76561197968194884,
        "timestamp": 1278511615,
        "itemID": 105006538,
        "wrenchNumber": 59
      },
      {
        "steamID": 76561197968553381,
        "timestamp": 1278354533,
        "itemID": 102568896,
        "wrenchNumber": 24
      },
      {
        "steamID": 76561197968984229,
        "timestamp": 1278553605,
        "itemID": 105548224,
        "wrenchNumber": 75
      },
      {
        "steamID": 76561197969224486,
        "timestamp": 1278466725,
        "itemID": 104542266,
        "wrenchNumber": 49
      },
      {
        "steamID": 76561197969488041,
        "timestamp": 1278365427,
        "itemID": 103243020,
        "wrenchNumber": 25
      },
      {
        "steamID": 76561197970434575,
        "timestamp": 1278294472,
        "itemID": 101444067,
        "wrenchNumber": 12
      },
      {
        "steamID": 76561197970750579,
        "timestamp": 1278476064,
        "itemID": 104668540,
        "wrenchNumber": 51
      },
      {
        "steamID": 76561197971088688,
        "timestamp": 1278294465,
        "itemID": 101444045,
        "wrenchNumber": 1
      },
      {
        "steamID": 76561197971880161,
        "timestamp": 1278294472,
        "itemID": 101444065,
        "wrenchNumber": 11
      },
      {
        "steamID": 76561197972402179,
        "timestamp": 1278400738,
        "itemID": 103774297,
        "wrenchNumber": 34
      },
      {
        "steamID": 76561197973807184,
        "timestamp": 1278543404,
       
... (truncated)
```

</details>

---

## ITFSystem_440

### 获取TF2世界状态

**接口**: `ITFSystem_440/GetWorldStatus/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "beta_stress_test_event_active": false,
    "event_match_group": "k_eTFMatchGroup_Invalid",
    "event_expire_time": 0,
    "active_client_version": 10515055
  }
}
```

</details>

---

## IEconItems_440

### 获取TF2 Schema URL

**接口**: `IEconItems_440/GetSchemaURL/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "status": 1,
    "items_game_url": "http://media.steampowered.com/apps/440/scripts/items/items_game.1d62f5c09ba2e14f6d4a4abc24dd8bb5921aa4b0.txt"
  }
}
```

</details>

### 获取TF2商店元数据

**接口**: `IEconItems_440/GetStoreMetaData/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "carousel_data": {
      "max_display_banners": 0,
      "banners": [
        {
          "basefilename": "01_welcometostore",
          "action": "none",
          "placement": "front",
          "action_param": "0"
        }
      ]
    },
    "tabs": [
      {
        "label": "Top Sellers",
        "id": "1909853392",
        "parent_id": 0,
        "use_large_cells": true,
        "default": true,
        "children": [
          {
            "name": "Taunts",
            "id": "433363577"
          }
        ],
        "home": true
      },
      {
        "label": "Items",
        "id": "3776899405",
        "parent_id": 0,
        "use_large_cells": false,
        "default": false,
        "children": [
          {
            "name": "Weapons",
            "id": "1376697313"
          },
          {
            "name": "Cosmetics",
            "id": "2526276177"
          },
          {
            "name": "Tools",
            "id": "3942309495"
          }
        ],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "Weapons",
        "id": "1376697313",
        "parent_id": 3776899405,
        "use_large_cells": false,
        "default": false,
        "parent_name": "Items",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "Cosmetics",
        "id": "2526276177",
        "parent_id": 3776899405,
        "use_large_cells": false,
        "default": false,
        "parent_name": "Items",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "Taunts",
        "id": "433363577",
        "parent_id": 1909853392,
        "use_large_cells": false,
        "default": false,
        "parent_name": "Top Sellers",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "Tools",
        "id": "3942309495",
        "parent_id": 3776899405,
        "use_large_cells": false,
        "default": false,
        "parent_name": "Items",
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3814588639
      },
      {
        "label": "Bundles",
        "id": "3634838168",
        "parent_id": 0,
        "use_large_cells": true,
        "default": false,
        "children": [],
        "home": false,
        "dropdown_prefab_id": 1517563449
      },
      {
        "label": "Maps",
        "id": "1194199205",
        "parent_id": 0,
        "use_large_cells": false,
        "default": false,
        "children": [],
        "home": false,
        "dropdown_prefab_id": 3298336616
      }
    ],
    "filters": [
      {
        "id": 1662615936,
        "name": "player_classes",
        "url_history_param_name": "c",
        "all_element": {
          "id": 991457757,
          "localized_text": "All"
        },
        "elements": [
          {
            "name": 
... (truncated)
```

</details>

### 获取TF2商店状态

**接口**: `IEconItems_440/GetStoreStatus/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "result": {
    "status": 1,
    "store_status": 0
  }
}
```

</details>

---

## ISteamBroadcast

### 广播观众心跳

**接口**: `ISteamBroadcast/ViewerHeartbeat/v1`  
**状态码**: `400`

<details><summary>返回数据</summary>

```json
"<html><head><title>Bad Request</title></head><body><h1>Bad Request</h1>Required parameter 'sessionid' is missing</body></html>"
```

</details>

---

## ISteamUserAuth

### 验证用户票据

**接口**: `ISteamUserAuth/AuthenticateUserTicket/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {
    "error": {
      "errorcode": 3,
      "errordesc": "Invalid parameter"
    }
  }
}
```

</details>

---

## ISteamUserOAuth

### 获取Token详情

**接口**: `ISteamUserOAuth/GetTokenDetails/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "success": 15,
  "reason": "Access Denied"
}
```

</details>

---

## IInventoryService

### 获取价格表 (CS2)

**接口**: `IInventoryService/GetPriceSheet/v1`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "response": {}
}
```

</details>

---

## Store API

### 获取商店详情 (CS2 中文)

**接口**: `Store API /appdetails`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "730": {
    "success": true,
    "data": {
      "type": "game",
      "name": "Counter-Strike 2",
      "steam_appid": 730,
      "required_age": 0,
      "is_free": true,
      "dlc": [
        2678630
      ],
      "detailed_description": "二十多年来，在全球数百万玩家的共同铸就下，Counter-Strike 提供了精湛绝伦的竞技体验。而如今，CS 传奇的下一章即将揭开序幕，那就是 Counter-Strike 2。<br><br>Counter-Strike 2 是 CS:GO 的免费升级版，展现了 Counter-Strike 历史上最大的技术飞跃。Counter-Strike 2 由 Source 2 引擎打造，具备基于物理的逼真渲染、最为先进的网络、经过升级的社区创意工坊工具，令人耳目一新。<br><br>Counter Strike 系列于 1999 年开创了以完成目标为重的游戏玩法，而 Counter Strike 2 除了将这一经典元素保留，还会呈现以下特色：<br><br><ul class=\"bb_ul\"><li>全新 CS 综合得分与经过更新的优先权模式<br></li><li>全球及区域排行榜<br></li><li>经过升级和大改的地图<br></li><li>革命性的动态烟雾弹<br></li><li>不受刷新频率阻碍的游戏体验<br></li><li>全新设计的声画效果<br></li><li>CS:GO 的所有物品均迁移至 CS2</li></ul>",
      "about_the_game": "二十多年来，在全球数百万玩家的共同铸就下，Counter-Strike 提供了精湛绝伦的竞技体验。而如今，CS 传奇的下一章即将揭开序幕，那就是 Counter-Strike 2。<br><br>Counter-Strike 2 是 CS:GO 的免费升级版，展现了 Counter-Strike 历史上最大的技术飞跃。Counter-Strike 2 由 Source 2 引擎打造，具备基于物理的逼真渲染、最为先进的网络、经过升级的社区创意工坊工具，令人耳目一新。<br><br>Counter Strike 系列于 1999 年开创了以完成目标为重的游戏玩法，而 Counter Strike 2 除了将这一经典元素保留，还会呈现以下特色：<br><br><ul class=\"bb_ul\"><li>全新 CS 综合得分与经过更新的优先权模式<br></li><li>全球及区域排行榜<br></li><li>经过升级和大改的地图<br></li><li>革命性的动态烟雾弹<br></li><li>不受刷新频率阻碍的游戏体验<br></li><li>全新设计的声画效果<br></li><li>CS:GO 的所有物品均迁移至 CS2</li></ul>",
      "short_description": "二十多年来，在全球数百万玩家的共同铸就下，Counter-Strike 提供了精湛绝伦的竞技体验。而如今，CS 传奇的下一章即将揭开序幕，那就是 Counter-Strike 2。",
      "supported_languages": "捷克语, 丹麦语, 荷兰语, 英语<strong>*</strong>, 芬兰语, 法语, 德语, 匈牙利语, 意大利语, 日语, 韩语, 挪威语, 波兰语, 葡萄牙语 - 葡萄牙, 葡萄牙语 - 巴西, 罗马尼亚语, 俄语, 简体中文, 西班牙语 - 西班牙, 瑞典语, 泰语, 繁体中文, 土耳其语, 保加利亚语, 乌克兰语, 希腊语, 西班牙语 - 拉丁美洲, 越南语, 印度尼西亚语<br><strong>*</strong>具有完全音频支持的语言",
      "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/header_schinese.jpg?t=1749053861",
      "capsule_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/capsule_231x87_schinese.jpg?t=1749053861",
      "capsule_imagev5": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/capsule_184x69_schinese.jpg?t=1749053861",
      "website": "http://counter-strike.net/",
      "pc_requirements": {
        "minimum": "<strong>最低配置:</strong><br><ul class=\"bb_ul\"><li><strong>操作系统:</strong> Windows® 10<br></li><li><strong>处理器:</strong> 4 硬件线程 CPU——英特尔® 酷睿™ i5 750 或以上<br></li><li><strong>内存:</strong> 8 GB RAM<br></li><li><strong>显卡:</strong> 显卡须为 1 GB 或以上，且应兼容 DirectX 11 并支持 Shader Model 5.0<br></li><li><strong>DirectX 版本:</strong> 11<br></li><li><strong>存储空间:</strong> 需要 85 GB 可用空间</li></ul>"
      },
      "mac_requirements": {
        "minimum": "<strong>最低配置:</strong><br><ul class=\"bb_ul\"><li><strong>操作系统:</strong> macOS X 10.11（El Capitan）或更新版本<br></li><li><strong>处理器:</strong> 英特尔酷睿双核处理器（2GHz 或以上）<br></li><li><strong>内存:</strong> 2 GB RAM<br></li><li><strong>显卡:</strong> ATI Radeon HD 2400 或以上 / NVidia 8600M 或以上<br></li><li><strong>存储空间:</strong> 需要 15 GB 可用空间</li></ul>"
... (truncated)
```

</details>

### 获取商店推荐分类(中文)

**接口**: `Store API /featuredcategories`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "0": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "周末特惠",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/787dbdd22ea0ed83953b6131/spotlight_image_english.jpg?t=1773191698",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/app/546560"
      }
    ]
  },
  "1": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "发行商特卖",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/af0e8f18d0fa479a996fc6d6/67a090bcc5b31ad387c9737ba9ebf8497883d804/spotlight_image_english.jpg?t=1776724802",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/sale/eapublishersale"
      }
    ]
  },
  "2": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "周末特惠",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/5a1121d992c2c2fc3fb92f72/spotlight_image_english.png?t=1773347397",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/app/1903340"
      }
    ]
  },
  "3": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "周末特惠",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/f0b0bb43826c0cd499dc91af/spotlight_image_english.png?t=1770245973",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/app/2592160"
      }
    ]
  },
  "4": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "周末特惠",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/af71457b684fb90b322205a8/ba6ffafb6f2ccebf15d8abc3438fc3b19ea4738c/spotlight_image_english.png?t=1776364809",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/app/1687950"
      }
    ]
  },
  "5": {
    "id": "cat_spotlight",
    "name": "Spotlights",
    "items": [
      {
        "name": "周末特惠",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/spotlights/6e3b050f1ee7938db9ce6d18/7b661541185b60c2f6b171d09369511c1eea2c23/spotlight_image_english.png?t=1775158907",
        "body": "优惠截止时间：%1$s",
        "url": "https://store.steampowered.com/app/728880"
      }
    ]
  },
  "6": {
    "id": "cat_dailydeal",
    "name": "Daily Deal",
    "items": [
      {
        "id": 378970,
        "type": 0,
        "discounted": true,
        "currency": "SGD",
        "original_price": 4500,
        "final_price": 900,
        "discount_percent": 80,
        "name": "Aliens Franchise Advertising App",
        "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/378970/4b955a911aea85683cdd66a0ea5c155045e78411/header_schinese.jpg?t=1775088883",
        "purchase_package": 51156
      }
    ]
  },
  "s
... (truncated)
```

</details>

### 获取包详情(中文)

**接口**: `Store API /packagedetails`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "62002": {
    "success": false
  }
}
```

</details>

### 商店搜索 Cyberpunk(中文)

**接口**: `Store API /storesearch`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "total": 10,
  "items": [
    {
      "type": "app",
      "name": "赛博朋克 2077",
      "id": 1091500,
      "price": {
        "currency": "SGD",
        "initial": 6900,
        "final": 2415
      },
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/47c51dbc7cbec037001f1a23e1289d475be8fd5e/capsule_231x87_schinese.jpg?t=1769690377",
      "metascore": "86",
      "platforms": {
        "windows": true,
        "mac": true,
        "linux": false
      },
      "streamingvideo": false,
      "controller_support": "full"
    },
    {
      "type": "app",
      "name": "《赛博朋克 2077：往日之影》",
      "id": 2138330,
      "price": {
        "currency": "SGD",
        "initial": 3499,
        "final": 2274
      },
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2138330/81d31c2f205f707d6767d0a87fe363e8c33dd525/capsule_231x87_schinese.jpg?t=1768305060",
      "metascore": "",
      "platforms": {
        "windows": true,
        "mac": true,
        "linux": false
      },
      "streamingvideo": false,
      "controller_support": "full"
    },
    {
      "type": "app",
      "name": ".45 PARABELLUM BLOODHOUND - Cyberpunk Active Time Action",
      "id": 3014650,
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3014650/capsule_231x87.jpg?t=1721346606",
      "metascore": "",
      "platforms": {
        "windows": true,
        "mac": false,
        "linux": false
      },
      "streamingvideo": false,
      "controller_support": "full"
    },
    {
      "type": "app",
      "name": "VA-11 Hall-A: Cyberpunk Bartender Action",
      "id": 447530,
      "price": {
        "currency": "SGD",
        "initial": 1500,
        "final": 1005
      },
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/447530/capsule_231x87.jpg?t=1730740610",
      "metascore": "77",
      "platforms": {
        "windows": true,
        "mac": false,
        "linux": true
      },
      "streamingvideo": false
    },
    {
      "type": "app",
      "name": "Keylocker | Turn Based Cyberpunk Action",
      "id": 1325040,
      "price": {
        "currency": "SGD",
        "initial": 1977,
        "final": 1285
      },
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1325040/ed8f46afa234db7586ec636e33c6a0f0797eb2be/capsule_231x87.jpg?t=1755902833",
      "metascore": "",
      "platforms": {
        "windows": true,
        "mac": false,
        "linux": false
      },
      "streamingvideo": false,
      "controller_support": "full"
    },
    {
      "type": "app",
      "name": "CEO Sim: Cyberpunk",
      "id": 2731370,
      "price": {
        "currency": "SGD",
        "initial": 1850,
        "final": 1850
      },
      "tiny_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2731370/1f8db08b8201570149c5f179122be5be907b57ef/capsule_231x87.jpg?t=1776
... (truncated)
```

</details>

### 获取促销页面

**接口**: `Store API /salepage`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "status": 2
}
```

</details>

---

