# my-steam-notes · 长期发展路线图

> 📍 本手册归属：《手册总目录》（E:\github\手册总目录.md，相对路径 ../../手册总目录.md）｜ 总手册：《运维手册》（E:\github\运维手册.md）。**改动本手册后必须同步更新《手册总目录》对应条目。**

> 2026-11-17 编写 | 基于当前项目状态 + Steam API 全面调研 + 竞品分析

---

## 一、项目现状资产

### 已建成

| 层 | 组件 | 状态 |
|---|---|---|
| **采集** | 60s 好友状态 + 20min 库扫描 + 30min 在线人数 | ✅ 手机 supervisord 自愈 |
| **存储** | 本地 SQLite 15 张表（含每日/时段聚合） | ✅ 永久历史 |
| **API** | 13 只读接口（status/me/friends/friend/{steamid}/leaderboards/shared/games/polls/friend-polls/sweeps/news/stats/raw） | ✅ 公网可达（手机 `api_server.py` :8083 ← nginx :8082 反代） |
| **矩阵终端** | steam.zhili-he.top 10 个自动刷新面板，3 栏紧贴布局 | ✅ 含下钻详情 |
| **对外站** | GitHub Pages Linear 风格 + 好友社交面板 + treemap 游戏云 | ✅ 双语 |
| **部署** | deploy.ps1 一键推手机 + install-inner.sh 幂等安装 | ✅ |

### 数据积累（截至 2026-11-17）

- 好友库：4,475 行游戏数据，39 好友（37 公开 + 2 私密）
- 好友总时长：113,350 小时
- 等级/徽章/封禁/地区：37-40 人覆盖
- 原始轮询：`friend_status_polls` 约 170 万行（60s 级精度，好友 30 天保留、本人 45 天）
- 每日聚合：friend_presence_daily + my_presence_daily 永久保留

### 当前痛点

| 问题 | 影响 | 优先级 |
|---|---|---|
| 手机 WiFi 芯片故障 | 全站不可用（单点故障） | 🔴 P0 |
| Pages fallback 数据为空 | 手机挂了对外站也没数据 | 🔴 P0 |
| 无离线告警 | 手机挂 13 小时才发现 | 🟡 P1 |

> ⚠️ 2026-11-18 核验订正：上表"手机 WiFi 芯片故障 → 全站不可用"**已非现状**——手机（192.168.0.104）在线并承载 stock/steam/buffotte 全部站点（《运维手册》§13.124 重启实证）。**单点故障风险仍成立**：所有生产站全压在一台手机上。Pages 数据新鲜度现由**手机 steam-collector（60s）+ PC 计划任务 `SteamNotebookCollector`（每 30 分钟推 main→deploy.yml）+ 手机 cron** 三层保障（§13.121/§13.126）。

---

## 二、Steam API 完整盘点

### 2.1 已使用的官方接口

| 接口 | 频率 | 用途 |
|---|---|---|
| `ISteamUser/GetPlayerSummaries` | 60s | 实时状态（自己+39好友合并单调用） |
| `ISteamUser/GetFriendList` | 30min | 好友名单 |
| `ISteamUser/GetPlayerBans` | 每轮换 | VAC/游戏/社区封禁 |
| `IPlayerService/GetOwnedGames` | 逐好友/轮换 | 游戏库+时长 |
| `IPlayerService/GetRecentlyPlayedGames` | 5min | 双周会话 |
| `IPlayerService/GetSteamLevel` | 逐好友 | Steam 等级 |
| `IPlayerService/GetBadges` | 逐好友 | 徽章/XP |
| `ISteamUserStats/GetNumberOfCurrentPlayers` | 30min | 游戏实时在线 |
| `ISteamUserStats/GetPlayerAchievements` | 逐好友 | 成就完成度 |
| `ISteamNews/GetNewsForApp` | 每日 | 更新速递 |
| Store `appdetails` | 每日 | 游戏详情/类型 |

### 2.2 未使用的高价值官方接口

| 接口 | 数据 | 开发难度 | 价值 |
|---|---|---|---|
| **`ISteamUser/GetUserGroupList`** | 好友所在 Steam 群组 | ⭐ 简单 | 群组重叠分析——"你和好友共同在哪些群" |
| **`ISteamUser/ResolveVanityURL`** | 自定义 URL → steamid | ⭐ 简单 | 支持用户输入自定义 URL 查询 |
| **`IPlayerService/GetCommunityBadgeProgress`** | 社区徽章进度 | ⭐⭐ | 更详细的徽章完成度 |
| **`ISteamUserStats/GetSchemaForGame`** | 游戏成就 schema（名称/描述/图标） | ⭐⭐ | 成就展示更丰富（目前只有 apiname） |
| **`ISteamUserStats/GetGlobalAchievementPercentagesForApp`** | 全球成就达成率 | ⭐ 简单 | "你的稀有成就"更准确 |
| **`ISteamUserStats/GetUserStatsForGame`** | 游戏内数值统计（击杀/胜场/得分） | ⭐⭐⭐ | **CS2/Dota2/Apex 战绩深挖**——"你比好友强多少" |
| **`IEconService/GetTradeOffers`** | 交易报价（需登录 token） | ⭐⭐⭐⭐ | 交易历史追踪 |
| **`IEconService/GetTradeHistory`** | 历史交易记录 | ⭐⭐⭐⭐ | 物品流向分析 |
| **`ISteamRemoteStorage/GetPublishedFileDetails`** | 创意工坊订阅 | ⭐⭐ | 工坊内容重叠 |
| **`IPlayerService/GetProfileItems`** | 个人资料装饰（背景/头像框） | ⭐ | 趣味展示 |

### 2.3 非官方/半官方接口（高价值）

| 接口 | 获取方式 | 数据 | 价值 |
|---|---|---|---|
| **Steam Store `appdetails?filters=price_overview`** | `store.steampowered.com/api/appdetails?appids=X` | 实时价格 + 折扣 | **游戏降价提醒**——"好友常玩的游戏半价了" |
| **Steam Wishlist** | `store.steampowered.com/wishlist/profiles/{steamid}/wishlistdata/?p=1` | 好友愿望单 | **"好友想要什么游戏"**——送礼建议/共同购买 |
| **Steam Community Profile** | `steamcommunity.com/profiles/{id}?xml=1` | 详细资料（群组/好友数/等级） | 补充数据源 |
| **Steam Market Price** | `steamcommunity.com/market/priceoverview/?appid=X&market_hash_name=Y` | 市场物品价格 | 饰品/交易卡价格追踪 |
| **Steam Reviews** | `store.steampowered.com/appreviews/{appid}?json=1` | 游戏评价 | 好友常玩游戏的口碑 |

### 2.4 第三方 API

| 服务 | 免费额度 | 数据 | 价值 |
|---|---|---|---|
| **[IsThereAnyDeal](https://isthereanydeal.com)** | 免费 API key | 多平台价格比较/历史最低/折扣提醒 | 最全的游戏价格追踪 |
| **[SteamDB](https://steamdb.info)** | 无 API（仅网页） | 玩家数估算/更新历史/包信息 | 数据最全但需爬虫 |
| **[SteamSpy](https://steamspy.com/about.php)** | 免费 API | 游戏估算销量/同时在线/标签 | 市场分析 |
| **[OpenCritic](https://opencritic.com/api)** | 免费 | 聚合游戏评分 | 评价参考 |

---

## 三、竞品分析

| 项目/产品 | 核心功能 | 我们缺什么 | 可以借鉴什么 |
|---|---|---|---|
| **[SteamTracker](https://github.com/LucasPrette/SteamTracker)** | 库同步 + 愿望单 + 价格追踪 | 愿望单、价格 | 多平台价格聚合思路 |
| **[GameTracker](https://github.com/Inderjit01/GameTracker)** | 跨平台（Steam/Epic/Xbox/PS）游戏收藏 | 跨平台 | 桌面端 + 多平台聚合 |
| **Steam Replay（官方年终总结）** | 年度回顾（时长/成就/游戏） | 年度总结报告 | 数据叙事化——把数据变成故事 |
| **SteamDB** | 最全的游戏数据库 | 数据广度 | 玩家数历史图表 |
| **Backloggd** | 社交游戏收藏 + 评论 | 社交功能 | 游戏评分/笔记/状态标记 |

### 我们的独特优势

1. **60 秒级实时好友追踪**——所有竞品都是天级/小时级
2. **好友社交分析**——排行榜/共同游戏/夜猫子/地区分布/成就对比
3. **矩阵终端**——信息密度爆炸的个人数据驾驶舱
4. **完整数据管线**——采集→聚合→API→展示，全自有

---

## 四、发展路线（按时间维度）

### 🔴 Phase 0：生存保障（本周）

```
┌─────────────────────────────────────────────────────┐
│  目标：手机不再是单点故障，服务可持续运转              │
└─────────────────────────────────────────────────────┘
```

> ⚠️ 2026-11-18 核验：Phase 0 已于 2026-11 落地，但**最终实现与下表方案不同**——备份走手机 `backup_db.py`（每日 03:40 快照 → `/root/steam-notes/backups`）+ backup-guardian 夜拉 `steam-backup.db`（**不进 GitHub 私有分支**）；采集冗余=手机 60s 采集 + PC 30min 计划任务 + 手机 cron 日结，GitHub Actions 定时已于 2026-11-18 全部停用。详见《运维手册》§13.121/§13.124/§13.126。

| # | 任务 | 说明 | 工作量 |
|---|---|---|---|
| 0.1 | **手机网络恢复** | USB 共享网络 / WiFi 硬件更换 / 考虑换机 | 用户操作 |
| 0.2 | **Pages 好数据快照** | 从手机拉一份有 friends_hub 的 dashboard.json commit 到 repo | 10min |
| 0.3 | **心跳告警** | PC 定时脚本（5min cron）ping 手机 8081，不通弹 Windows 通知 | 30min |
| 0.4 | **数据备份到 GitHub** | 每日 sqlite dump → 私有分支，手机丢了数据不丢 | 1h |

### 🟡 Phase 1：采集冗余 + 核心体验（本月）

```
┌─────────────────────────────────────────────────────┐
│  目标：数据永不断流 + 终端体验拉满                    │
└─────────────────────────────────────────────────────┘
```

| # | 任务 | 说明 | 新增数据/功能 |
|---|---|---|---|
| 1.1 | ~~**Actions 备份采集器**~~ **已废弃（2026-11-18）** | GitHub Actions 每小时跑一次 collector（Turso 模式）——方案作废：Turso 降为冷存档不再写入，`poll_status`/`daily_sync` 定时已 `disabled_manually`；现冗余=手机 60s 采集 + PC 30min 计划任务 + 手机 cron | 冗余 |
| 1.2 | **好友愿望单追踪** | 爬 `store.steampowered.com/wishlist/profiles/{id}` → 表 friend_wishlist | "好友想要什么" |
| 1.3 | **游戏价格监控** | appdetails price_overview → 表 game_prices（时间序列） | **"好友常玩的游戏降价了"** |
| 1.4 | **成就 schema 增强** | GetSchemaForGame → 成就名称/图标/描述存入 game_achievements | 成就展示更丰富 |
| 1.5 | **终端 PWA** | manifest.json + service worker → 手机主屏一键打开 | 移动端体验 |
| 1.6 | **每周自动摘要** | cron 生成 markdown 周报（本周谁玩最多/新游戏/趋势变化） | 数据→洞察 |

### 🟢 Phase 2：深度数据 + 智能分析（3 个月）

```
┌─────────────────────────────────────────────────────┐
│  目标：从"看数据"到"懂你"——模式识别和推荐            │
└─────────────────────────────────────────────────────┘
```

| # | 任务 | 说明 | 价值 |
|---|---|---|---|
| 2.1 | **好友行为事件流** | 自动生成事件："jimi 开始玩 Apex" "WldBeeHo 3天没上线" | 社交动态时间线 |
| 2.2 | **历史趋势可视化** | 月度在线时长趋势线 / 好友活跃度热力图 / 游戏生命周期 | 长期洞察 |
| 2.3 | **游戏内战绩对比** | GetUserStatsForGame → CS2 K/D、Dota2 胜率 vs 好友 | **"你比好友强多少"** |
| 2.4 | **共同游戏推荐** | "你有 5 个好友最近在玩 X，你没有 → 试试？" | 发现新游戏 |
| 2.5 | **IsThereAnyDeal 集成** | 多平台价格 + 历史最低 + 折扣通知 | 最全价格追踪 |
| 2.6 | **年度报告** | 类 Steam Replay 的个人年度总结（自动生成，可分享） | 数据叙事化 |
| 2.7 | **群组分析** | GetUserGroupList → 好友共同群组图谱 | 社交图谱 |

### 🔵 Phase 3：平台化 + 可持续（6 个月+）

```
┌─────────────────────────────────────────────────────┐
│  目标：从个人工具变成可持续的基础设施                  │
└─────────────────────────────────────────────────────┘
```

| # | 任务 | 说明 |
|---|---|---|
| 3.1 | **迁移到 VPS** | $3-5/月 VPS（如 RackNerd/CloudCone），比手机更稳定 |
| 3.2 | **多用户支持** | 其他 Steam 用户也能注册使用（OAuth 登录） |
| 3.3 | **公开 API + 文档** | 开放数据接口，让开发者建自己的看板 |
| 3.4 | **模式识别** | 最佳开黑搭档（时间重叠度）/ 好友流失预警 / 游戏推荐引擎 |
| 3.5 | **跨平台聚合** | Epic/Xbox/PS 游戏库统一追踪 |
| 3.6 | **Chrome 扩展** | 浏览 Steam 页面时悬浮显示好友数据 |

---

## 五、技术架构演进

### 当前架构（v1）

```
Steam API → M11P 手机采集器 → SQLite → Dashboard JSON
                                         ↓
                              nginx → Cloudflare Tunnel
                                         ↓
                         ┌───────────────┼───────────────┐
                    矩阵终端         Pages 前端       数据 API
                  (steam.zhili-he.top)  (GitHub Pages)  (/api/*)
```

### 目标架构（v2）

```
                    ┌── 主采集器（VPS/手机）──┐
                    │  60s 状态 + 库扫描     │
                    │  价格 + 愿望单 + 战绩  │
                    └────────┬──────────────┘
                             │
                    ┌── 备份采集器（Actions）──┐
                    │  每小时兜底             │
                    └────────┬──────────────┘
                             │
                        SQLite / Turso
                             │
              ┌──────────────┼──────────────────┐
              │              │                  │
         数据 API       分析引擎           告警系统
         (/api/*)      (趋势/推荐/事件)    (降价/上线/离线)
              │              │                  │
         ┌────┴────┬────────┴──────┬──────────┴─┐
         │         │               │            │
    矩阵终端   Pages 站点      周报/年度报告   通知推送
                                    (可分享)
```

### 关键技术决策

| 决策点 | 建议 | 理由 |
|---|---|---|
| 数据库 | 继续用 SQLite | 单机够用，备份方便，性能好 |
| 采集冗余 | ~~Actions 每小时 + 主采集器 60s~~ → **主采集器 60s（手机）+ PC 30min 计划任务 + 手机 cron 日结** | Actions 定时已于 2026-11-18 停用（Turso 冷存档），冗余改由 PC 任务与手机 cron 承担 |
| 前端 | 保持 React + Vite | 生态成熟，PWA 支持好 |
| API 层 | 考虑加 GraphQL | 灵活查询，前端按需取数 |
| 部署 | 短期手机，长期 VPS | 手机适合验证，VPS 适合稳定运行 |
| 告警 | Telegram Bot / 系统通知 | 免费且即时 |

---

## 六、数据科学机会

拥有 60 秒级精度的长期数据，可以做很多有趣的分析：

### 6.1 社交行为分析

| 分析 | 数据源 | 输出 |
|---|---|---|
| **最佳开黑搭档** | friend_presence_hourly 时间重叠度 | "你和 jimi 的游戏时间重叠 78%" |
| **好友活跃周期** | friend_presence_daily 趋势 | "这周比上周少玩了 20 小时" |
| **社交网络图谱** | 共同游戏 + 共同群组 + 好友关系 | 力导向图可视化 |
| **流失预警** | 在线频率骤降 | "WldBeeHo 已经 7 天没上线了" |

### 6.2 游戏行为分析

| 分析 | 数据源 | 输出 |
|---|---|---|
| **游戏生命周期** | playtime 时间序列 | "你在 CS2 上花了 2000h，近 3 个月只玩了 5h" |
| **品类偏好变化** | game_details genres + 时间 | "你从策略游戏转向了 FPS" |
| **成就完成率对比** | friend_achievements | "你在 Apex 完成率 92%，超过 95% 的好友" |
| **价格敏感度** | 购买时间 vs 折扣时间 | "你 80% 的游戏是打折时买的" |

### 6.3 预测模型（需要足够数据积累）

| 模型 | 输入 | 输出 |
|---|---|---|
| 下次上线时间预测 | 历史在线模式 | "jimi 通常在 22:00-01:00 上线" |
| 游戏推荐 | 库存 + 好友行为 + 品类偏好 | "基于你的模式，试试 X" |
| 在线时长预测 | 趋势 + 季节性 | "预计本月在线 120h（上月 95h）" |

---

## 七、风险与对策

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| 手机硬件故障 | 高（WiFi 已死） | 全站不可用 | Actions 备份采集 + 迁移 VPS |
| Steam API 变更/限制 | 中 | 采集中断 | 多接口冗余 + 社区关注变更 |
| Cloudflare 免费额度 | 低 | 公网不可达 | 可换 Cloudflare Pages Workers |
| SQLite 数据损坏 | 低 | 数据丢失 | 每日备份到 GitHub |
| 好友设置隐私 | 中 | 部分数据不可见 | 优雅降级 + 标注"私密" |
| Steam 账号安全 | 低 | API key 泄露 | key 定期轮换 + 不公开 |

---

## 八、总结

```
当前定位：个人 Steam 社交数据引擎
       ↓
3 个月目标：数据永不断流 + 核心功能拉满
       ↓
6 个月目标：从工具变成基础设施（多用户 + 公开 API）
       ↓
长期愿景：Steam 社交数据的最佳个人分析平台
```

**最重要的一步：先让系统不依赖任何单点硬件。**

---

*文档位置：`docs/ROADMAP.md`*
*最后更新：2026-11-18*

---

> ✅ 最后核验：2026-11-18（手册治理代理对照《运维手册》§0/§2/§13.125 当前真实状态逐项核验；统一索引见《手册总目录》）
