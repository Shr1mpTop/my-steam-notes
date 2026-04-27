# Steam API 测试结果

Steam ID: `76561198367786896` | 测试时间: 来自脚本 `test_all_apis.py`

---

## 获取玩家基础信息

**接口**: `ISteamUser/GetPlayerSummaries`  
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
        "gameextrainfo": "Counter-Strike 2",
        "gameid": "730",
        "loccountrycode": "SG"
      }
    ]
  }
}
```

</details>

---

## 获取好友列表

**接口**: `ISteamUser/GetFriendList`  
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
        "relationship": "friend",
        "friend_since": 1739162213
      },
      {
        "steamid": "76561199179314468",
        "relationship": "friend",
        "friend_since": 1625553612
      },
      {
        "steamid": "76561199179790448",
        "relationship": "friend",
        "friend_since": 1639841416
      },
      {
        "steamid": "76561199180168949",
        "relationship": "friend",
        "friend_since": 1624781634
      },
      {
        "steamid": "76561199184636102",
        "relationship": "friend",
        "friend_since": 1714385549
      },
      {
        "steamid": "76561199184637765",
        "relationship": "friend",
        "friend_since": 1632318808
      },
      {
        "steamid": "76561199184830382",
        "relationship": "friend",
        "friend_since": 1625490316
      },
      {
        "steamid": "76561199189466907",
        "relationship": "friend",
        "friend_since": 1632321802
      },
      {
        "steamid": "76561199192859169",
        "relationship": "friend",
        "friend_since": 1633015397
      },
      {
        "steamid": "76561199194550728",
        "relationship": "friend",
        "friend_since": 1687235978
      },
      {
        "steamid": "76561199201315710",
        "relationship": "friend",
        "friend_since": 1772537272
      },
      {
        "steamid": "76561199206700253",
        "relationship": "friend",
        "friend_since": 1639841259
      },
      {
        "steamid": "76561199212735309",
        "relationship": "friend",
        "friend_since": 1727705863
      },
      {
        "steamid": "76561199223192140",
        "relationship": "friend",
        "friend_since": 1689329045
      },
      {
        "steamid": "76561199244274077",
        "relationship": "friend",
        "friend_since": 1645074986
      },
      {
        "steamid": "76561199244382639",
        "relationship": "friend",
        "friend_since": 1663417200
      },
      {
        "steamid": "76561199387781925",
        "relationship": "friend",
        "friend_since": 1692012759
      }
    ]
  }
}
```

</details>

---

## 获取所有游戏及游玩时长

**接口**: `IPlayerService/GetOwnedGames`  
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
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 80,
        "name": "Counter-Strike: Condition Zero",
        "playtime_forever": 25,
        "img_icon_url": "077b050ef3e89cd84e2c5a575d78d53b54058236",
        "playtime_windows_forever": 25,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 1694958343,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 100,
        "name": "Counter-Strike: Condition Zero Deleted Scenes",
        "playtime_forever": 0,
        "img_icon_url": "077b050ef3e89cd84e2c5a575d78d53b54058236",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "playtime_disconnected": 0
      },
      {
        "appid": 130,
        "name": "Half-Life: Blue Shift",
        "playtime_forever": 0,
        "img_icon_url": "b06fdee488b3220362c11704be4edad82abeed08",
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
        "appid": 220,
        "name": "Half-Life 2",
        "playtime_forever": 135,
        "img_icon_url": "fcfb366051782b8ebf2aa297f3b746395858cb62",
        "has_community_visible_stats": true,
        "playtime_windows_forever": 135,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 1765365960,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 240,
        "name": "Counter-Strike: Source",
        "playtime_forever": 30,
        "img_icon_url": "9052fa60c496a1c03383b27687ec50f4bf0f0e10",
        "has_community_visible_stats": true,
        "playtime_windows_forever": 30,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 1694960206,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 280,
        "name": "Half-Life: Source",
        "playtime_forever": 0,
        "img_icon_url": "b4f572a6cc5a6a84ae84634c31414b9123d2f26b",
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "playtime_disconnected": 0
      },
      {
        "appid": 300,
        "name": "Day of Defeat: Source",
        "playtime_forever": 137,
        "img_icon_url": "062754bb5853b0534283ae27dc5d58200692b22d",
        "has_community_visible_stats": true,
        "playtime_windows_forever": 137,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 1765365455,
        "content_descriptorids": [
          2,
          5
        ],
        "playtime_disconnected": 0
      },
      {
        "appid": 320,
        "name": "Half-Life 2: Deathmatch",
        "playtime_forever": 0,
        "img_icon_url": "795e85364189511f4990861b578084deef086cb1",
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
        "appid": 360,
        "name": "Half-Life Deathmatch: Source",
        "playtime_forever": 0,
        "img_icon_url": "40b8a62efff5a9ab356e5c56f5c8b0532c8e1aa3",
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
        "appid": 400,
        "name": "Portal",
        "playtime_forever": 0,
        "img_icon_url": "cfa928ab4119dd137e50d728e8fe703e4e970aff",
        "has_community_visible_stats": true,
        "playtime_windows_forever": 0,
        "playtime_mac_forever": 0,
        "playtime_linux_forever": 0,
        "playtime_deck_forever": 0,
        "rtime_last_played": 0,
        "playtime_disconnected": 0
      },
      {
        "appid": 500,
        "name": "Left 4 Dead",
        "playtime_forever": 0,
        "img_icon_url": "428df26bc35b09319e31b1ffb712487b20b3245c",
        "has_community_visible_stats": true,
        "pl
... (truncated)
```

</details>

---

## 获取近两周游玩记录

**接口**: `IPlayerService/GetRecentlyPlayedGames`  
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
        "playtime_2weeks": 257,
        "playtime_forever": 111386,
        "img_icon_url": "8dbc71957312bbd3baea65848b545be9eae2a355",
        "playtime_windows_forever": 110910,
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
        "appid": 1621690,
        "name": "Core Keeper",
        "playtime_2weeks": 72,
        "playtime_forever": 549,
        "img_icon_url": "53517a1b2eb22e22ac4a1f71c814209f1b84c063",
        "playtime_windows_forever": 549,
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

---

## 获取玩家成就 (CS2)

**接口**: `ISteamUserStats/GetPlayerAchievements`  
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

---

## 获取全球成就完成率 (CS2, 无需Key)

**接口**: `ISteamUserStats/GetGlobalAchievementPercentagesForApp`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "achievementpercentages": {
    "achievements": [
      {
        "name": "PLAY_CS2",
        "percent": "38.6"
      }
    ]
  }
}
```

</details>

---

## 获取商店详情 (赛博朋克2077, 中文)

**接口**: `Store API /appdetails`  
**状态码**: `200`

<details><summary>返回数据</summary>

```json
{
  "1091500": {
    "success": true,
    "data": {
      "type": "game",
      "name": "赛博朋克 2077",
      "steam_appid": 1091500,
      "required_age": 0,
      "is_free": false,
      "controller_support": "full",
      "dlc": [
        2138330,
        1495710,
        2060310
      ],
      "detailed_description": "<h1>《赛博朋克 2077：终极版》</h1><p><p class=\"bb_paragraph\" ><span class=\"bb_img_ctn\"><img class=\"bb_img\" src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/d68972fb48e4603246e6da5d49239b84.avif?t=1769690377\" width=616 height=670 /></span></p></p><br><h1>关于游戏</h1><p class=\"bb_paragraph\" ><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/ba2db44b37abac30286ae9340232ca86.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/ba2db44b37abac30286ae9340232ca86.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/ba2db44b37abac30286ae9340232ca86.mp4?t=1769690377\" type=\"video/mp4\"></video></span></p>",
      "about_the_game": "<p class=\"bb_paragraph\" ><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/bc6661c7ff3744a669a1dbe1df46e23b.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/1c256b705c717fdb795af513ae705ef4.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/a8528a83c6af6685523850efe8df8c01.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f44cd0d347fb2d7476a6fb09f2cd9fcc.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/f23c014c7a41805721e7c39335cad60b.mp4?t=1769690377\" type=\"video/mp4\"></video></span><span class=\"bb_img_ctn\"><video class=\"bb_img\" autoplay muted loop playsinline poster=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/ba2db44b37abac30286ae9340232ca86.poster.avif?t=1769690377\" width=1170 height=450 ><source src=\"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/extras/ba2db44b37abac30286ae9340232ca86.webm?t=1769690377\" type=\"video/webm; codecs=vp9\"><source src=\"https://shared.akamai.
... (truncated)
```

</details>

---

