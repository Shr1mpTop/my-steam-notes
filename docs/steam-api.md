


这是一份为你定制的 **Steam Web API 核心接口详细说明文档**。考虑到你之前提到的“使用 GitHub Actions 追踪个人游戏数据”的设想，我在这份文档中为你重点整理了最相关的接口，并提供了具体的调用方法和代码示例。

---

# 🎮 Steam Web API 开发者指南与核心接口文档

## 零基础准备与调用规则

### 1. 基础 URL 结构
Steam Web API 的所有请求都基于 HTTP(S) 协议，且通常使用 `GET` 请求。标准格式如下：
```text
https://api.steampowered.com/<接口类名 Interface>/<方法名 Method>/<版本号 Version>/?参数1=值1&参数2=值2
```
*   **Interface (接口类)**：比如 `ISteamUser`（用户相关）、`IPlayerService`（玩家服务）。
*   **Method (方法名)**：比如 `GetOwnedGames`（获取拥有游戏）。
*   **Version (版本)**：通常是 `v0001` 或 `v0002` 等。

### 2. 身份验证与必备参数
绝大多数接口都需要两个核心参数：
*   **`key` (Steam Web API Key)**：你的专属开发者密钥。申请地址：[Steam 开发者 API 密钥](https://steamcommunity.com/dev/apikey)。（**注意保密！**）
*   **`steamid` (Steam 64位 ID)**：你要查询的玩家的唯一标识符。它是一个17位的纯数字（例如 `76561198xxxxxxxxx`）。

### 3. 数据返回格式
默认返回 **JSON** 格式数据，非常适合 Python/Node.js 解析。你也可以在 URL 末尾加上 `&format=xml` 来获取 XML 格式。

---

## 一、 用户基础信息接口 (`ISteamUser`)

这类接口用于查询玩家的社交资料。

### 1. 获取玩家基础信息 (GetPlayerSummaries)
*   **接口名**：`ISteamUser/GetPlayerSummaries/v0002/`
*   **具体作用**：获取玩家的昵称、头像链接、最后离线时间、当前在线状态、以及**当前正在玩的游戏**。
*   **必需参数**：
    *   `key`: API Key
    *   `steamids`: 玩家的 64 位 SteamID（支持逗号分隔批量查询）
*   **调用示例**：
    ```bash
    https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_KEY&steamids=76561198000000000
    ```

### 2. 获取好友列表 (GetFriendList)
*   **接口名**：`ISteamUser/GetFriendList/v0001/`
*   **具体作用**：获取某玩家的所有好友名单以及添加好友的时间戳。（**前提：玩家资料的“好友列表”设为公开**）
*   **必需参数**：`key`, `steamid`
*   **可选参数**：`relationship` (填 `friend` 表示只获取确认的好友)。

---

## 二、 玩家游戏库存与游玩记录 (`IPlayerService`)

🌟 **这部分是你用来做 GitHub Actions 每日追踪的核心接口！**

### 1. 获取玩家拥有的游戏及总时长 (GetOwnedGames)
*   **接口名**：`IPlayerService/GetOwnedGames/v0001/`
*   **具体作用**：获取玩家游戏库内的所有游戏，以及该玩家在每款游戏上的总游玩时间。
*   **必需参数**：`key`, `steamid`
*   **核心可选参数**：
    *   `include_appinfo=true`：**极度建议加上**。加上后，返回的数据不仅有 AppID，还会包含游戏名称和图标 Hash 值，否则只有干巴巴的 ID。
    *   `include_played_free_games=true`：是否包含玩过的免费游戏（如 Dota2、CS2）。如果不加，只返回花钱买的游戏。
*   **调用示例**：
    ```bash
    https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=YOUR_KEY&steamid=YOUR_ID&include_appinfo=true&include_played_free_games=true
    ```
*   **关键返回值解析**：
    *   `playtime_forever`：总游玩时间（单位：**分钟**）。
    *   `playtime_windows_forever`：在 Windows 系统上的游玩时间。

### 2. 获取近期游玩记录 (GetRecentlyPlayedGames)
*   **接口名**：`IPlayerService/GetRecentlyPlayedGames/v0001/`
*   **具体作用**：获取玩家在**过去 2 周（14天）内**玩过的游戏列表及对应的游玩时间。
*   **非常适合做“每日动态”**：因为列表很短，不用每次拉取几千个游戏的数据。
*   **必需参数**：`key`, `steamid`
*   **可选参数**：`count`（限制返回的游戏数量）。
*   **关键返回值解析**：
    *   `playtime_2weeks`：过去两周的总游玩时间（单位：分钟）。

---

## 三、 游戏成就与全局统计 (`ISteamUserStats`)

### 1. 获取玩家某款游戏的成就 (GetPlayerAchievements)
*   **接口名**：`ISteamUserStats/GetPlayerAchievements/v0001/`
*   **具体作用**：查询特定玩家在特定游戏里，哪些成就解锁了，哪些没解锁。
*   **必需参数**：
    *   `key`: API Key
    *   `steamid`: 玩家 ID
    *   `appid`: 游戏的 AppID（可以在 Steam 商店 URL 中找到，比如 GTA5 是 271590）
*   **关键返回值解析**：返回列表会包含 `apiname` (成就代码名)，`achieved` (1表示已解锁，0表示未解锁)，`unlocktime` (解锁的 Unix 时间戳)。

### 2. 获取游戏内成就的全球完成率 (GetGlobalAchievementPercentagesForApp)
*   **接口名**：`ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/`
*   **具体作用**：获取某款游戏全服玩家的成就达成率。
*   **必需参数**：`gameid`（注意这里叫 gameid，其实就是 appid）。此接口**不需要** API Key。

---

## 四、 补充必备：Steam Store API (商店接口)

⚠️ **注意**：Steam Web API 通常只返回游戏名称和 AppID，如果你需要**游戏的封面大图、游戏价格、中文介绍**，你必须结合 Steam 商店 API 使用。这套 API 不需要申请 Key。

### 1. 获取游戏商店详情 (App Details)
*   **接口名**：`https://store.steampowered.com/api/appdetails`
*   **必需参数**：`appids` (游戏 ID，支持多个用逗号隔开)
*   **可选参数**：`l=schinese` (强制返回简体中文介绍)。
*   **调用示例**：
    ```bash
    https://store.steampowered.com/api/appdetails?appids=1091500&l=schinese
    ```
    *返回值中包含：`header_image` (游戏封面图，非常适合用在 GitHub 主页上展示)、`price_overview` (价格)、`categories` (是否支持手柄、单人/多人等)。*

---

## 五、 实战演练：Python 调用示例

假设你的 GitHub Actions 运行 Python 脚本来获取“最近两周玩过的游戏”，代码如下：

```python
import os
import requests
import json

# 从环境变量获取（在 GitHub Actions Secrets 里配置）
STEAM_API_KEY = os.getenv('STEAM_API_KEY') 
STEAM_ID = os.getenv('STEAM_ID')

def get_recent_games():
    url = "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/"
    params = {
        'key': STEAM_API_KEY,
        'steamid': STEAM_ID,
        'format': 'json'
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        total_count = data['response'].get('total_count', 0)
        
        if total_count == 0:
            print("最近两周没有玩任何游戏或隐私设置为私密。")
            return
        
        games = data['response']['games']
        print(f"最近两周共玩了 {total_count} 款游戏：\n")
        
        for game in games:
            name = game['name']
            # 将分钟转换为小时并保留一位小数
            playtime_2weeks_hours = round(game['playtime_2weeks'] / 60, 1) 
            playtime_total_hours = round(game['playtime_forever'] / 60, 1)
            
            print(f"🎮 游戏: {name}")
            print(f"   近两周游玩: {playtime_2weeks_hours} 小时")
            print(f"   总计游玩: {playtime_total_hours} 小时")
            print("-" * 30)
    else:
        print(f"请求失败，状态码: {response.status_code}")

if __name__ == "__main__":
    # 在本地测试时，可以直接写死秘钥测试，但推送到 Github 前记得改成环境变量！
    get_recent_games()
```

### 💡 开发者避坑提示
1.  **图片资源拼接**：如果你拿到了 `GetOwnedGames` 返回的 `img_icon_url`，它的完整图片地址格式是：
    `http://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{img_icon_url}.jpg`
2.  **调用频率限制**：Steam API 官方限制是 **每天 100,000 次请求**，对于你的个人数据追踪脚本来说绝对够用了。
3.  **隐私错误排除**：如果你发现接口返回的是 `{"response": {}}` 空数组，99% 的可能性是你要查询的 Steam 账号的“我的个人资料 -> 隐私设置”中，把“游戏详情”设置成了“私密”或“仅限好友”。**必须设为“公开” API 才能读到**。