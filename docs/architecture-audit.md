# 项目架构审计与整改任务清单

审计时间：2026-04-28  
审计范围：Python 数据同步脚本、Turso 数据访问、dashboard 数据模型、React/Vite 前端、GitHub Actions、项目目录与依赖。

## 总体判断

这个项目已经具备完整闭环：Steam API/Turso 采集 -> `data/dashboard.json` 生成 -> React Dashboard 展示 -> GitHub Actions 自动更新与部署。当前最大问题不是功能缺失，而是边界不够清晰：采集、建模、渲染、部署策略混在一起，导致 dashboard 冲突、Actions 互相取消、重复代码、测试缺口和后续维护成本上升。

目标架构应该更简单：

1. `data/dashboard.json` 是唯一 dashboard 数据源。
2. 数据采集脚本只写数据库，不负责页面模型。
3. dashboard 构建脚本只读数据库并生成展示模型。
4. 前端只消费展示模型，不做关键业务聚合。
5. Actions 分清高频轮询、每日同步、部署，不互相取消，不制造无意义提交。

## P0：必须优先修复的问题

### A-001 高频 Poll Workflow 会取消每日完整同步

证据：

- `.github/workflows/daily_sync.yml` 使用 `concurrency.group: steam-data-sync` 且 `cancel-in-progress: true`
- `.github/workflows/poll_status.yml` 也使用同一个 `concurrency.group: steam-data-sync` 且 `cancel-in-progress: true`
- `poll_status.yml` 每 5 分钟运行一次

风险：

每日完整同步可能执行到一半时，被下一次 5 分钟轮询取消。结果会出现数据库只同步了一部分、`data/dashboard.json` 未提交、更新速递缺失、Actions 偶发失败。

解决方案：

- `daily_sync.yml` 使用独立组，例如 `daily-steam-sync`。
- `poll_status.yml` 使用独立组，例如 `poll-steam-status`。
- 高频 poll 可保留 `cancel-in-progress: true`，每日 sync 建议 `cancel-in-progress: false` 或独立组。
- 如果需要避免同时写 Turso，应在脚本层做幂等，而不是用同一个 concurrency 组互相杀任务。

验收标准：

- 手动触发 daily sync 后，5 分钟 poll 不会取消它。
- Actions 页面中 daily sync 能完整跑完 `init_turso -> sync_turso -> sync_enrichment -> sync_game_updates -> poll_status`。

### A-002 `poll_status.py` 同时负责轮询和生成完整 dashboard，职责过重

证据：

- `scripts/poll_status.py` 既执行 `poll_status()` 写 `status_polls`，又执行 `generate_dashboard()` 生成完整 `data/dashboard.json`。
- `poll_status.yml` 高频运行时也会生成 dashboard，但现在不提交文件。

风险：

每 5 分钟轮询都会做大量 Turso 查询和 JSON 聚合，即使结果不会被提交。高频任务变慢、失败概率升高，也浪费 API/数据库额度。

解决方案：

- 拆成两个入口：
  - `scripts/poll_status.py`：只写 `status_polls`。
  - `scripts/build_dashboard.py`：只读数据库生成 `data/dashboard.json`。
- daily sync 最后调用 `build_dashboard.py`。
- 本地需要立即刷新页面时，也只运行 `build_dashboard.py`。

验收标准：

- 高频 workflow 只调用 poll 脚本，不产生 dashboard 文件 diff。
- dashboard 构建可以独立运行并生成完整 JSON。

### A-003 `data/dashboard.json` 作为 Git 提交数据源会持续制造冲突

证据：

- 近期已经发生 `main...origin/main [ahead/behind]` 和 `data/dashboard.json` 冲突。
- dashboard 是自动生成文件，变动频繁，且被 bot 提交到主分支。

风险：

代码提交和数据提交混在同一条 `main` 历史里，任何本地开发都容易被 bot commit 打断。后续多人协作时冲突会更频繁。

解决方案：

- 短期：每日只提交一次 dashboard，禁止 5 分钟 poll 提交，这已经是正确方向。
- 中期：把 dashboard 提交拆到单独分支，例如 `data/main`，部署时 checkout 两个来源。
- 长期：部署时从 Turso/API 构建数据 artifact，不把高频生成数据写回代码分支。

验收标准：

- 主分支不会因为 5 分钟 poll 产生 dashboard commit。
- 本地开发一整天内不再频繁遇到 bot 数据提交冲突。

## P1：高优先级架构与代码问题

### A-004 前端直接 import `../../../data/dashboard.json`，会把数据打进 JS bundle

证据：

- `web/src/hooks/useDashboard.ts` 直接 `import dashboard from "../../../data/dashboard.json"`。
- `npm run build` 后 JS chunk 约 644 KB，dashboard 数据会进入应用 bundle。

风险：

页面数据更新必须重新构建前端 bundle。数据越大，JS 越大，首屏加载变慢；未来 dashboard 增长后会影响 Pages 体验。

解决方案：

- 保持唯一源文件 `data/dashboard.json`。
- Vite 构建阶段通过插件或脚本把 `data/dashboard.json` 作为独立静态 asset 输出到 `dist/data/dashboard.json`，前端运行时 fetch 这个 asset。
- 不在仓库维护 `web/public/dashboard.json`，只在构建产物中复制。

验收标准：

- 源码里仍只有 `data/dashboard.json`。
- 构建产物有独立 dashboard asset。
- JS bundle 不包含完整 dashboard JSON。

### A-005 `sync_turso.py` 的每日快照不可更新，重复运行会保留旧日数据

证据：

- `scripts/sync_turso.py` 先查当天 `daily_snapshots`。
- 如果 appid 已存在当天记录，则直接跳过。
- 插入使用 `INSERT OR IGNORE`。

风险：

如果早上运行过一次，晚上再次运行不会更新当天的 `daily_playtime`，导致当天统计偏低。你之前看到 weekday 当天为 0，本质上就是“当天数据实时性”问题的一个表现。

解决方案：

- `daily_snapshots` 今日记录应该 `UPSERT`，更新 `playtime_forever` 和 `daily_playtime`。
- `daily_playtime` 应基于“昨日最终快照”计算，而不是当天已有记录。
- 增加 `snapshot_kind` 或 `is_final` 字段，区分实时估算和日终定稿。

验收标准：

- 同一天重复运行 `sync_turso.py`，当天游戏时长会增长而不是停在第一次运行值。
- 日终 dashboard 与 Steam 总时长一致。

### A-006 `build_weekly_digest()` 使用 `LIMIT 50` 行，会截断真实一周数据

证据：

- `scripts/poll_status.py` 中 `build_weekly_digest()` 查询 `daily_snapshots WHERE daily_playtime > 0 ORDER BY date DESC LIMIT 50`。
- 这个 limit 是“行数”，不是“日期数”。

风险：

如果一天玩过很多游戏，50 行可能只覆盖少数几天，weekly digest 会不完整甚至为空。

解决方案：

- 先查最近 7 个 distinct date。
- 再用这些日期查询所有 daily_snapshots。
- 或直接 SQL 按日期聚合，top games 单独查询。

验收标准：

- 最近 7 天中每天多游戏时，weekly digest 仍包含完整 7 天。

### A-007 `build_pareto()` 和 `build_stats()` 对空库/零时长缺少保护

证据：

- `build_pareto()` 使用 `round(cumulative / total * 100, 1)`，当 total 为 0 会除零。
- `build_stats()` 中 `p = r["playtime_forever"] / total_pt`，当所有时长为 0 会除零。

风险：

新用户、API 返回空数据、数据库初始化后首次运行会直接失败，导致 Actions 红灯。

解决方案：

- 所有聚合函数加空数据保护。
- 为 `build_dashboard` 加最小 fixture 测试：空数据库、只有未玩游戏、只有一个游戏、无 achievements。

验收标准：

- 空数据情况下 dashboard 仍生成合法 JSON。

### A-008 `build_game_weather()` 空数据返回结构不完整

证据：

- 空数据返回 `{"forecast": "Clear skies", "games": []}`。
- 前端 `GameWeather` 使用 `weather.top_game`。

风险：

无 recent sessions 时 UI 显示 `dominated by undefined`，或者未来严格类型下报错。

解决方案：

- 后端统一返回 `top_game: ""`。
- 前端对空 `top_game` 做文案分支。

验收标准：

- 无 recent sessions 时页面不出现 `undefined`。

### A-009 Steam 更新速递分类规则过宽，可能混入普通新闻

证据：

- `scripts/sync_game_updates.py` 中只要 haystack 包含 `"update"` 就归为 Update。
- 当前 `Thronefall | Dev Update` 被归类为 Update，但内容偏开发进度，未必是玩家意义上的版本更新。

风险：

用户要求“只是更新不能其他新闻”，现规则可能把开发日志、路线图、公告类新闻误判为更新。

解决方案：

- 分类分两级：
  - `strict_update`: patch notes、hotfix、changelog、version/build 号、bug fix。
  - `soft_update`: dev update、monthly update、roadmap。
- UI 默认只展示 `strict_update`。
- 软更新可放到“可能相关”折叠区。
- 为分类器增加样例测试。

验收标准：

- Dev diary / community update 不进入默认 Update Briefing。
- Patch Notes / Hotfix / Changelog 保留。

### A-010 Turso 客户端缺少环境变量校验与重试

证据：

- `scripts/turso_db.py` 直接构造 `TURSO_URL` 和 `HEADERS`。
- `TURSO_URL` 或 `TURSO_TOKEN` 缺失时，错误会在 HTTP 请求时才暴露。
- 没有 retry/backoff。

风险：

Actions secrets 缺失时错误不清晰；网络抖动会导致整个每日任务失败。

解决方案：

- 启动时校验必需环境变量。
- 对 429/5xx/连接错误做指数退避重试。
- 隐藏 token，错误日志只输出 host 和状态码。

验收标准：

- secrets 缺失时 1 秒内失败并提示具体变量名。
- 临时 5xx 至少重试 3 次。

## P2：中期重构与简化

### A-011 前端组件存在重复常量和算法

证据：

- `GENRE_COLORS` 在 `GameCloud.tsx` 和 `Insights.tsx` 重复。
- `truncate()` 在多个组件重复。
- treemap/bubble/颜色逻辑分散在组件内部。

风险：

改一次配色要改多个文件，容易出现视觉不一致。组件文件越来越大，后续维护困难。

解决方案：

- 新增 `web/src/lib/colors.ts`：统一 genre colors、chart palette。
- 新增 `web/src/lib/format.ts`：统一 hour/date/text truncate。
- 新增 `web/src/lib/layout.ts`：treemap/bubble 布局算法。

验收标准：

- genre 颜色只定义一次。
- `Insights.tsx` 从 424 行下降到 250 行以内。

### A-012 `index.css` 过大，样式边界不清晰

证据：

- `web/src/index.css` 约 1163 行。
- 包含全局 token、布局、卡片、所有组件细节和响应式规则。

风险：

样式回归概率高。之前进度条消失，就是全局规则改动影响多个组件的例子。

解决方案：

- 保留 `index.css` 只放 reset、tokens、layout。
- 按组件拆分 CSS module 或 `components/*.css`。
- 对通用进度条、卡片、badge 形成小型 design system。

验收标准：

- 全局 CSS 少于 300 行。
- 组件样式与组件同目录。
- 修改一个组件样式不会影响所有进度条。

### A-013 `GameNetwork` 使用固定气泡坐标，数据变化后可能重叠

证据：

- `Insights.tsx` 中 `BUBBLE_SLOTS` 是固定坐标数组。
- 气泡半径根据数据动态变化，但布局坐标不避让。

风险：

类型数量/连接权重变化后，气泡可能重叠、文本互相覆盖。

解决方案：

- 使用已安装的 `d3-force` 做 force layout，或者移除依赖并实现简单 collision。
- 由于 `d3-force` 已在 package 中，建议真正使用它；否则删除依赖。

验收标准：

- 20 个 bubble 时无明显重叠。
- `d3-force` 依赖要么被使用，要么从 package 中移除。

### A-014 存在明显未使用入口和模板资源

证据：

- `main.py` 只输出 `"Hello from my-steam-notes!"`。
- `scripts/sync_games.py` 是本地 sqlite 版旧同步，与 Turso 链路重复。
- `web/src/assets/react.svg`、`vite.svg`、`hero.png` 未被引用。
- `d3-force` 当前未被代码引用。

风险：

新维护者会误判入口，运行错误脚本；依赖和资源也增加噪音。

解决方案：

- 删除 `main.py` 或改成 CLI 入口。
- 标记 `sync_games.py` 为 legacy 并移动到 `scripts/legacy/`，或删除。
- 删除未使用模板资源。
- 清理未使用 npm 依赖。

验收标准：

- `rg` 找不到未使用的模板资源。
- README 中只有一条推荐同步路径。

### A-015 缺少真正的自动化测试

证据：

- `scripts/test_all_apis.py`、`scripts/test_all_apis_full.py` 更像 API 探针，不是 CI 单元测试。
- 前端只有 lint/build，没有组件或数据转换测试。
- Python 没有 pytest 配置。

风险：

dashboard 聚合逻辑、更新分类、空数据处理没有测试保护。后续 UI/数据口径改动容易回归。

解决方案：

- 加 `pytest`。
- 抽出纯函数：update classifier、weekday aggregation、weekly digest builder、pareto builder。
- 加最小 fixture JSON。
- CI 中运行 `uv run pytest` 和 `npm run lint/build`。

验收标准：

- 至少覆盖 P1 中空数据和分类器场景。
- PR/Actions 中测试失败会阻止部署。

### A-016 数据模型类型在 Python 和 TypeScript 之间没有契约

证据：

- Python 手写 dict 输出 dashboard。
- TypeScript 手写 `DashboardData`。
- 两边没有 schema 校验。

风险：

字段改名、缺字段、类型变化会到前端运行时才暴露。

解决方案：

- 定义 `dashboard.schema.json`。
- Python 生成后用 `jsonschema` 校验。
- TypeScript 类型从 schema 生成，或用 `zod` 在前端运行时校验。

验收标准：

- `poll_status.py` 输出 schema 不合格时失败。
- 前端类型与 schema 同源。

## 推荐整改路线

### 第 1 阶段：止血与稳定

1. 修复 Actions concurrency：daily 和 poll 分组隔离。
2. 拆 `poll_status.py` 和 `build_dashboard.py`。
3. 修 `sync_turso.py` 今日快照可更新。
4. 修空数据保护：pareto、stats、weather。
5. 严格化 update classifier。

### 第 2 阶段：降低复杂度

1. 清理 legacy 脚本和 unused assets/deps。
2. 抽出共享 `colors/format/layout`。
3. 拆分 `index.css`。
4. 用独立 asset 加载 dashboard，避免 JSON 打进 JS。

### 第 3 阶段：工程化

1. 加 dashboard schema。
2. 加 pytest 与关键聚合测试。
3. 加前端数据适配测试。
4. 评估把 `data/dashboard.json` 从主分支提交迁移到独立数据分支或部署 artifact。

## 当前项目做得好的地方

1. 已经保持 `data/dashboard.json` 为唯一源数据文件，这是正确方向。
2. Turso 作为持久层，避免把所有历史数据塞进 Git。
3. 前端 dashboard 已经组件化，视觉层有统一 token 的基础。
4. GitHub Actions 已具备自动采集、构建、部署闭环。
5. Steam 更新速递已经有初版分类和持久化表，后续只需要提高分类质量。

## 最小下一步建议

如果只做一轮高收益整改，建议按这个顺序：

1. 先修 A-001，避免 daily sync 被 poll 取消。
2. 再修 A-002，拆出 `build_dashboard.py`。
3. 然后修 A-005，保证当天数据可更新。
4. 同时修 A-009，避免 Update Briefing 误报。
5. 最后清理 A-014，让项目入口清晰。
