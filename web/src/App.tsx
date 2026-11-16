import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useDashboard } from "./hooks/useDashboard";
import { MotionPrefProvider } from "./hooks/motionPref";
import { useMotionPref } from "./hooks/motionPrefContext";
import type { MotionLevel } from "./hooks/motionPrefContext";
import { useLocale } from "./useLocale";
import { HeroBackdrop } from "./components/HeroBackdrop";
import { ProfileHero } from "./components/ProfileHero";
import { SocialPresence } from "./components/SocialPresence";
import { GameCloud } from "./components/GameCloud";
import { RecentActivity } from "./components/RecentActivity";
import { ContributionMap } from "./components/ContributionMap";
import { TimeHeatmap, GamingClock, WeekdayChart } from "./components/TimeAnalytics";
import { ParetoChart, PlatformPie } from "./components/Ranking";
import { StatsCards, GameNetwork, DustMeter, StayingPower } from "./components/Insights";
import { AchievementBoard, GenreChart } from "./components/AchievementBoard";
import { GameWeather, WeeklyDigest } from "./components/FunWidgets";
import { GameUpdates } from "./components/GameUpdates";
import "./App.css";

type Density = "comfortable" | "compact";

const DENSITY_STORAGE_KEY = "steam-notebook-density-v3";

function initialDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return saved === "compact" || saved === "comfortable" ? saved : "comfortable";
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ConfigPanel({
  locale,
  setLocale,
  density,
  setDensity,
  motion,
  setMotion,
}: {
  locale: string;
  setLocale: (l: "zh" | "en") => void;
  density: Density;
  setDensity: (d: Density) => void;
  motion: MotionLevel;
  setMotion: (m: MotionLevel) => void;
}) {
  const { t } = useLocale();
  const summary = `${locale === "zh" ? "中文" : "EN"} · ${
    density === "compact" ? t("layoutCompact") : t("layoutComfortable")
  } · ${motion === "reduced" ? t("motionReduced") : t("motionFull")}`;

  return (
    <details className="config-panel">
      <summary className="config-button" aria-label={t("configLabel")}>
        <GearIcon />
        <span className="config-button-label">{summary}</span>
      </summary>
      <div className="config-menu">
        <div className="config-section" role="group" aria-label={t("switchLabel")}>
          <span className="config-section-label">{t("switchLabel")}</span>
          <div className="config-options">
            <button
              className={`config-option${locale === "zh" ? " is-active" : ""}`}
              type="button"
              aria-pressed={locale === "zh"}
              onClick={() => setLocale("zh")}
            >
              中文
            </button>
            <button
              className={`config-option${locale === "en" ? " is-active" : ""}`}
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
          </div>
        </div>

        <div className="config-section" role="group" aria-label={t("layoutLabel")}>
          <span className="config-section-label">{t("layoutLabel")}</span>
          <div className="config-options">
            <button
              className={`config-option${density === "comfortable" ? " is-active" : ""}`}
              type="button"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
            >
              {t("layoutComfortable")}
            </button>
            <button
              className={`config-option${density === "compact" ? " is-active" : ""}`}
              type="button"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
            >
              {t("layoutCompact")}
            </button>
          </div>
        </div>

        <div className="config-section" role="group" aria-label={t("motionLabel")}>
          <span className="config-section-label">{t("motionLabel")}</span>
          <div className="config-options">
            <button
              className={`config-option${motion === "full" ? " is-active" : ""}`}
              type="button"
              aria-pressed={motion === "full"}
              onClick={() => setMotion("full")}
            >
              {t("motionFull")}
            </button>
            <button
              className={`config-option${motion === "reduced" ? " is-active" : ""}`}
              type="button"
              aria-pressed={motion === "reduced"}
              onClick={() => setMotion("reduced")}
            >
              {t("motionReduced")}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}

function Dashboard() {
  const { data, loading, error, source } = useDashboard();
  const { locale, setLocale, t } = useLocale();
  const { motion, setMotion } = useMotionPref();
  const [density, setDensity] = useState<Density>(initialDensity);

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  if (loading) {
    return (
      <div className="loading">
        <div className="boot-inner">
          <div className="boot-ring" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="error">{t("error")}: {error}</div>;
  }
  if (!data) return null;

  const localeTag = locale === "zh" ? "zh-CN" : "en-US";

  return (
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "never"}>
      <div className="app" id="top">
        <div className="bg-fx" aria-hidden="true" />
        <div className="bg-noise" aria-hidden="true" />
        <HeroBackdrop />

        <header className="topbar">
          <div className="shell topbar-inner">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">Steam Notebook</span>
              <span className="brand-sub">{t("dashboardKicker")}</span>
            </div>
            <div className="topbar-actions">
              <span className={`live-badge${source === "snapshot" ? " is-snapshot" : ""}`}>
                <span className="live-dot" aria-hidden="true" />
                {source === "live" ? t("sourceLive") : t("sourceSnapshot")}
              </span>
              <ConfigPanel
                locale={locale}
                setLocale={setLocale}
                density={density}
                setDensity={setDensity}
                motion={motion}
                setMotion={setMotion}
              />
            </div>
          </div>
        </header>

        <main className="shell" id="dashboard">
          <section className="hero" aria-label={t("dashboardTitle")}>
            <div className="dashboard-heading">
              <span className="dashboard-kicker">{t("dashboardKicker")}</span>
              <h1 className="dashboard-title">{t("dashboardTitle")}</h1>
              <p className="dashboard-subtitle">{t("dashboardSubtitle")}</p>
            </div>
            <ProfileHero player={data.player} milestone={data.milestone} />
          </section>

          <div className="bento">
            <div className="cell span-4"><GameWeather weather={data.game_weather} /></div>
            <div className="cell span-4"><WeeklyDigest digest={data.weekly_digest} /></div>
            <div className="cell span-4"><GamingClock data={data.time_heatmap} /></div>

            <div className="cell span-12"><SocialPresence presence={data.social_presence} /></div>
            <div className="cell span-8"><ContributionMap heatmap={data.heatmap} updatedAt={data.updated_at} /></div>
            <div className="cell span-4"><TimeHeatmap data={data.time_heatmap} /></div>

            <div className="cell span-5"><WeekdayChart data={data.weekday} heatmap={data.heatmap} /></div>
            <div className="cell span-7"><ParetoChart data={data.pareto} /></div>

            <div className="cell span-12"><GameCloud games={data.game_cloud} /></div>

            <div className="cell span-12"><StatsCards stats={data.stats} /></div>

            <div className="cell span-4"><DustMeter played={data.stats.played_games} never={data.stats.never_played} /></div>
            <div className="cell span-8"><RecentActivity activity={data.recent_activity} /></div>

            <div className="cell span-4"><PlatformPie data={data.platform} /></div>
            <div className="cell span-8"><GameNetwork network={data.game_network} /></div>

            <div className="cell span-5"><GenreChart genres={data.genres} /></div>
            <div className="cell span-7"><StayingPower games={data.game_cloud} /></div>

            <div className="cell span-12"><AchievementBoard achievements={data.achievements} /></div>
          </div>

          <section className="updates-section" id="updates" aria-label="Game update news">
            <div className="section-title">
              <span>STEAM</span>
              <h2>{t("updateFeed")}</h2>
              <p>{t("updateFeedSubtitle")}</p>
            </div>

            <GameUpdates updates={data.game_updates ?? []} />

            <footer className="footer">
              <span>Steam Notebook — {t("updated")} {new Date(data.updated_at).toLocaleString(localeTag)}</span>
              <span>{t("updated").toUpperCase()} · {data.updated_at.slice(0, 10)}</span>
            </footer>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

function App() {
  return (
    <MotionPrefProvider>
      <Dashboard />
    </MotionPrefProvider>
  );
}

export default App;
