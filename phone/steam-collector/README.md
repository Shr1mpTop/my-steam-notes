# phone/steam-collector — M11P 手机端采集 + 实时看板供数

> 📍 本手册归属：《手册总目录》（E:\github\手册总目录.md，相对路径 ../../../手册总目录.md）｜ 总手册：《运维手册》（E:\github\运维手册.md）。**改动本手册后必须同步更新《手册总目录》对应条目。**

> 2026-11-16 架构升级：**手机 = 数据库本体 + 采集器 + 实时 JSON 源**。
> 云端 Turso 已全量迁移为手机本地 SQLite，降级为冷存档。
> GitHub Pages 站点网址不变（Steam API key 注册挂的就是它），只换数据供给方式。

## 架构

```
Steam Web API (api.steampowered.com)
        │  60s/轮：本人+39好友状态(1次批量调用) + 好友名单(30min) + 时长(5min)
        ▼
M11P 手机 (192.168.0.104, proot Debian, supervisord 托管)
  steam-collector  ──►  /root/steam-notes/data/steam.db (SQLite WAL, 原 Turso schema)
  dashboard-loop   ──读库每分钟构建──►  /root/www-static/steam/dashboard.json
        │ nginx :8081  location /steam/ (+CORS *)
        ▼
cloudflared apex 隧道 ──►  https://steam-data.zhili-he.top/steam/dashboard.json  (公网数据端点)
        │ fetch (fallback: Pages 构建产物 /data/dashboard.json)
        ▼
GitHub Pages 看板 https://shr1mptop.github.io/my-steam-notes/  ←— 页面每 60s 自动拉新 JSON
```

- 采集精度：状态 1 分钟（原 GitHub Actions 30min cron 实际 15~35 分钟）；
- 页面新鲜度：JSON 每分钟重建 + 状态变化即时触发（≤5s），前端每 60s 拉取；
- Steam 配额：默认 ~1 call/min ≈ 1500 次/天 = 官方 10 万/天上限的 1.5%；
  2025-06 后突发限流实测 ~25 req/s、超限 429 + Retry-After 60~120s，采集器已内置退避。

> 2026-11-17 追加**第二站**：`steam.zhili-he.top` = 手机 nginx **:8082** 矩阵终端站
> （`web/terminal/index.html` 单文件零依赖），数据经 `api_server.py`（**:8083**，supervisord
> `steam-api`）读**同一个** steam.db；与 Pages 站并列，同源不同形态（《运维手册》§13.122）。

## 手机侧布局（Debian proot 内）

| 路径 | 内容 |
|---|---|
| `/root/steam-notes/` | 仓库副本（scripts/ + phone/），权威源在 PC 仓库 |
| `/root/steam-notes/venv/` | Python venv（requests + python-dotenv，清华源安装） |
| `/root/steam-notes/phone/steam-collector/.env` + `/root/steam-notes/.env` | 密钥+配置（chmod 600，不进 git） |
| `/root/steam-notes/data/steam.db` | **数据库本体**（WAL；schema 与原 Turso 完全一致） |
| `/root/www-static/steam/dashboard.json` | 实时看板 JSON（nginx 8081 `/steam/` + 8080 LAN 同源） |
| `/root/logs/steam-collector.log` / `steam-dashboard.log` / `steam-daily.log` | 日志（supervisor 轮转 5MB×3） |
| `/root/steam-notes/backups/` | `backup_db.py` 快照目录（rolling+dated；11-18 起在 proot 内部，不再落 /sdcard） |
| `/etc/supervisor/conf.d/steam-notes.conf` | 三个 program：steam-collector / steam-dashboard / steam-api（矩阵终端 API，11-17 增） |
| `/etc/cron.d/steam-notes` | 每日 01:17 全量同步+enrichment+更新速递（daily_local.py）；03:40 `backup_db.py` 快照 |

## 部署（PC 侧一键）

```powershell
# 0) 首次/迁移：把 Turso 迁到本地库（PC 跑，走 Clash 7897）
python phone\steam-collector\migrate_turso_to_sqlite.py --out phone\steam-collector\steam.db --force

# 1) 一键部署（打包 scripts+phone → $PREFIX/tmp 暂存 → proot 安装 → supervisor 拉起）
powershell -NoProfile -ExecutionPolicy Bypass -File phone\steam-collector\deploy.ps1

# 2) 验证
python C:\Users\Gigg1ty\mi-ai\mssh.py "proot-distro login debian --shared-tmp -- timeout 20 supervisorctl status"
curl http://192.168.0.104:8081/steam/dashboard.json      # 实时 JSON
curl https://steam-data.zhili-he.top/steam/dashboard.json # 公网端点
```

## .env 配置项

| 键 | 默认 | 说明 |
|---|---|---|
| STEAM_API_KEY / STEAM_ID / TURSO_URL / TURSO_TOKEN | — | TURSO_* 仅迁移时用 |
| STEAM_DB_MODE / STEAM_DB_PATH | local / /root/steam-notes/data/steam.db | scripts/turso_db.py 双模式开关（原 Actions 侧走 turso，现已 disabled）。⚠️ PC 计划任务必须**显式**设 STEAM_DB_MODE=local + STEAM_DB_PATH，置空会回落到手机默认 `/sdcard/...` 路径秒崩且静默（§13.126 实测） |
| POLL_INTERVAL | 60 | 本人状态轮询秒数 |
| FRIEND_INTERVAL | 60 | 好友快照秒数（与本人合并成一次批量调用，零额外 API 成本） |
| FRIENDLIST_INTERVAL | 1800 | 好友名单刷新 |
| PLAYTIME_INTERVAL | 300 | 游戏时长同步（游戏内分钟数精度所限，5min 足够） |
| DASHBOARD_INTERVAL | 60 | 看板 JSON 重建间隔；状态变化时即时触发 |
| RETENTION_SELF_DAYS / RETENTION_FRIEND_DAYS | 45 / 30 | 原始轮询行保留天数（每日 04:00+ 清理） |

## 数据契约（与 Turso 时代完全一致）

同一套表：status_polls / steam_friends / friend_status_polls / owned_games /
daily_snapshots / recent_sessions / player_daily / game_details / game_achievements /
steam_level / game_news_updates。build_dashboard.py 读本地库生成的 JSON 字段不变，
前端 web/（fetch 实时 JSON → fallback 构建快照）无需感知后端迁移。

## 已退役 / 保留

| 项 | 状态 |
|---|---|
| GitHub Actions poll_status.yml（30min 轮询） | **已在 GitHub 侧手动禁用（disabled_manually）**，保留 workflow_dispatch。⚠️ 本地 `retire-workflows` 分支里「删 schedule」的改动**从未推送**（推送凭据缺 workflow scope），别按「schedule 已删」去排查 |
| GitHub Actions daily_sync.yml（每日全量） | **disabled_manually**（同上），每日全量由手机 cron 01:17 接棒 |
| GitHub Actions deploy.yml（Pages 部署） | 保留：push 即部署。**2026-11-18 深夜起 `data/dashboard.json` 主要由 PC 计划任务 `SteamNotebookCollector`（每 30min，`scripts\steam-collector-task.ps1`）生成推 main**，为页面 fallback 快照——Pages 数据卡住先查这个 PC 任务，不是查手机（§13.126） |
| Turso 云库 | 冷存档（迁移后不再写入；密钥仍在 .env 供迁移脚本使用） |

## 备份

`steam.db` 每夜拉取已落地（2026-11-18）：backup-guardian 23:30 先经 mssh 触发一次新鲜
backup_db.py 快照（避免 SFTP 拉到撕裂的活 WAL），再拉 `steam-backup.db`，与 stock/us
同入 auto-* keep7。
手机侧快照目录 = `/root/steam-notes/backups/`（rolling+dated 双快照，11-18 从 /sdcard 迁正到 proot 内部）。
TIP: 迁移脚本可随时重跑（--force 重建），但采集器上线后重跑会覆盖增量数据——
先停 steam-collector 再迁。

## 踩坑备忘

- **铁律（2026-11-18）：一切运行时文件/库/暂存禁止放 /sdcard**——HyperOS 重启会收回
  Termux 存储权限（stockbot 11-17 全线趴窝实证）。暂存用 Termux $PREFIX/tmp
  （=proot /tmp），部署/库全在 proot rootfs。/sdcard 只允许冷备份。
- 手机直连 Turso 被 GFW 在 TLS 握手 reset（DNS 正常）→ 迁移必须在 PC 走 Clash。
- nginx 站点备份文件不能放 /etc/nginx/sites-enabled/（会被当站点加载 → duplicate default_server）。
- supervisorctl 一律 `timeout 20` 包裹；远程带引号/管道/变量的命令写 .sh 推 **$PREFIX/tmp** 执行（=proot /tmp；2026-11-18 起禁再用 /sdcard，见上条铁律；m11p skill 坑 24/25/26）。
- PS5.1 写 UTF-8 文件用 write/Edit 工具，别用 Get-Content/Set-Content 管道。

---

> ✅ 最后核验：2026-11-18（手册治理代理对照《运维手册》§0/§2/§13.125 当前真实状态逐项核验；统一索引见《手册总目录》）
