import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Locale = "zh" | "en";

type Messages = Record<string, string>;

const STORAGE_KEY = "steam-notebook-locale";

const messages: Record<Locale, Messages> = {
  zh: {
    localeName: "中文",
    switchLabel: "语言",
    switchTo: "EN",
    dashboardKicker: "Steam 数据终端",
    dashboardTitle: "个人游戏库观测台",
    dashboardSubtitle: "热力、时间、类型、成就、更新和投入曲线汇成一个纯粹的数据看板。",
    updated: "更新于",
    loading: "正在载入 Steam 宇宙...",
    error: "数据载入失败",
    statusOnline: "在线",
    statusOffline: "离线",
    playing: "正在玩",
    level: "等级",
    hoursPlayed: "游戏时长",
    moviesEquivalent: "电影等效",
    walkingDistance: "步行距离",
    booksRead: "书籍等效",
    xpLevel: "经验等级",
    toNext: "到下一级",
    gamingWeather: "游戏天气",
    currentForecast: "当前预报",
    dominatedBy: "主导游戏",
    weeklyDigest: "周报",
    latestWeekSummary: "最近一周概览",
    totalHours: "总时长",
    gamesPlayed: "玩过游戏",
    updateFeed: "更新动态",
    updateFeedSubtitle: "Steam 游戏开发更新与新闻",
    updateBriefing: "更新简报",
    updatePosts: "条来自游戏库的更新",
    noUpdates: "暂未抓取到游戏更新",
    runSync: "运行同步脚本以收集 Steam 更新。",
    activityHeatmap: "活跃热力图",
    noActivity: "暂无活跃数据",
    waitingPolls: "等待轮询数据",
    lastYear: "过去一年",
    activeDays: "活跃天数",
    less: "少",
    more: "多",
    total: "合计",
    online: "在线",
    whenYouPlay: "游玩时间分布",
    timeHeatmapSubtitle: "星期 × 小时，越亮代表越活跃",
    gamingClock: "游戏时钟",
    gamingClockSubtitle: "24 小时活跃节律",
    weekdayPreference: "星期偏好",
    weekdaySubtitle: "按星期统计的总游玩时间",
    gameCloud: "游戏云图",
    gameCloudSubtitle: "按时长切分，按类型分组",
    back: "返回",
    games: "款游戏",
    totalGames: "游戏总数",
    played: "已玩",
    dustRate: "吃灰率",
    loyalty: "忠诚度",
    peakDay: "峰值日",
    longestStreak: "最长连续",
    neverOpened: "从未打开",
    libraryActivation: "游戏库激活质量",
    never: "未玩",
    rule8020: "80/20 曲线",
    rule8020Subtitle: "少数游戏占据大部分时间",
    gameRank: "游戏排名",
    cumulative: "累计",
    platformBreakdown: "平台分布",
    hoursByPlatform: "按平台统计时长",
    recentActivity: "最近活动",
    recentActivitySubtitle: "最近两周游玩时长",
    noRecentActivity: "暂无最近活动。",
    twoWeekPlaytime: "两周时长",
    gameNetwork: "游戏网络",
    networkSubtitle: "气泡代表类型权重，连线代表同周期游玩关系",
    clusterGames: "该簇游戏数",
    links: "连接",
    genreDistribution: "类型分布",
    genreSubtitle: "按游戏类型统计时长",
    stayingPower: "留存强度",
    stayingSubtitle: "总时长与距上次游玩的天数",
    today: "今天",
    daysAgo: "天前",
    achievementBoard: "成就看板",
    unlocked: "已解锁",
    completed: "已 100% 完成",
    rare: "稀有",
  },
  en: {
    localeName: "English",
    switchLabel: "Language",
    switchTo: "中",
    dashboardKicker: "Steam Data Terminal",
    dashboardTitle: "Personal Library Observatory",
    dashboardSubtitle: "Heatmaps, time patterns, genres, achievements, updates, and playtime curves in one focused dashboard.",
    updated: "Updated",
    loading: "Loading your Steam universe...",
    error: "Failed to load data",
    statusOnline: "Online",
    statusOffline: "Offline",
    playing: "Playing",
    level: "Level",
    hoursPlayed: "Hours Played",
    moviesEquivalent: "Movies Equivalent",
    walkingDistance: "Walking Distance",
    booksRead: "Books Read",
    xpLevel: "XP Level",
    toNext: "to next",
    gamingWeather: "Gaming Weather",
    currentForecast: "Current forecast",
    dominatedBy: "dominated by",
    weeklyDigest: "Weekly Digest",
    latestWeekSummary: "Latest week summary",
    totalHours: "Total Hours",
    gamesPlayed: "Games Played",
    updateFeed: "Update Feed",
    updateFeedSubtitle: "Steam game development updates and news",
    updateBriefing: "Update Briefing",
    updatePosts: "update posts from your library",
    noUpdates: "No game update posts captured yet",
    runSync: "Run the update sync to collect Steam update posts.",
    activityHeatmap: "Activity Heatmap",
    noActivity: "No activity data yet",
    waitingPolls: "waiting for polls",
    lastYear: "in the last year",
    activeDays: "active days",
    less: "Less",
    more: "More",
    total: "Total",
    online: "online",
    whenYouPlay: "When You Play",
    timeHeatmapSubtitle: "Hour of day × day of week, brighter means more active",
    gamingClock: "Gaming Clock",
    gamingClockSubtitle: "24h activity pattern",
    weekdayPreference: "Weekday Preference",
    weekdaySubtitle: "Total playtime by day of week",
    gameCloud: "Game Cloud",
    gameCloudSubtitle: "Sized by playtime, grouped by genre",
    back: "Back",
    games: "games",
    totalGames: "Total Games",
    played: "Played",
    dustRate: "Dust Rate",
    loyalty: "Loyalty",
    peakDay: "Peak Day",
    longestStreak: "Longest Streak",
    neverOpened: "Never opened",
    libraryActivation: "Library activation quality",
    never: "Never",
    rule8020: "80/20 Rule",
    rule8020Subtitle: "Top games account for most of your playtime",
    gameRank: "Game Rank",
    cumulative: "Cumulative",
    platformBreakdown: "Platform Breakdown",
    hoursByPlatform: "Hours by platform",
    recentActivity: "Recent Activity",
    recentActivitySubtitle: "Last 2 weeks — hours played",
    noRecentActivity: "No recent activity.",
    twoWeekPlaytime: "2-week playtime",
    gameNetwork: "Game Network",
    networkSubtitle: "Bubble size = library weight, lines = genres played in the same period",
    clusterGames: "games in this cluster",
    links: "links",
    genreDistribution: "Genre Distribution",
    genreSubtitle: "Hours by game genre",
    stayingPower: "Staying Power",
    stayingSubtitle: "Total hours vs days since last played",
    today: "Today",
    daysAgo: "d ago",
    achievementBoard: "Achievement Board",
    unlocked: "unlocked",
    completed: "100% completed",
    rare: "rare",
  },
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function initialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "zh" ? saved : "zh";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "zh" ? "en" : "zh"),
    t: (key: string) => messages[locale][key] ?? key,
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
