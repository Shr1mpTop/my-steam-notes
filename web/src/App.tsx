import { useEffect, useState } from "react";
import { useDashboard } from "./hooks/useDashboard";
import { ProfileHero } from "./components/ProfileHero";
import { GameCloud } from "./components/GameCloud";
import { RecentActivity } from "./components/RecentActivity";
import { ContributionMap } from "./components/ContributionMap";
import { TimeHeatmap, GamingClock, WeekdayChart } from "./components/TimeAnalytics";
import { ParetoChart, PlatformPie } from "./components/Ranking";
import { StatsCards, GameNetwork, DustMeter, StayingPower } from "./components/Insights";
import { AchievementBoard, GenreChart } from "./components/AchievementBoard";
import { GameWeather, WeeklyDigest } from "./components/FunWidgets";
import { GameUpdates } from "./components/GameUpdates";
import { useLocale } from "./useLocale";
import "./App.css";

type Theme = "dark" | "paper";
type Density = "comfortable" | "compact";

const THEME_STORAGE_KEY = "steam-notebook-theme";
const DENSITY_STORAGE_KEY = "steam-notebook-density";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "paper";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "paper" || saved === "dark" ? saved : "paper";
}

function initialDensity(): Density {
  if (typeof window === "undefined") return "compact";
  const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return saved === "compact" || saved === "comfortable" ? saved : "compact";
}

function App() {
  const { data, loading, error } = useDashboard();
  const { locale, setLocale, t } = useLocale();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [density, setDensity] = useState<Density>(initialDensity);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "paper" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  if (loading) return <div className="loading">{t("loading")}</div>;
  if (error) return <div className="error">{t("error")}: {error}</div>;
  if (!data) return null;

  return (
    <div className="app dashboard-page" id="top">
      <section className="dashboard-shell cinematic-dashboard" id="dashboard" aria-label="Steam data dashboard">
        <div className="dashboard-topbar">
          <div className="dashboard-intro">
            <span>{t("dashboardKicker")}</span>
            <h1>{t("dashboardTitle")}</h1>
            <p>{t("dashboardSubtitle")}</p>
          </div>
          <div className="dashboard-actions">
            <details className="config-panel">
              <summary className="config-button" aria-label={t("configLabel")}>
                <span>{t("configLabel")}</span>
                <strong>{locale === "zh" ? "中文" : "EN"} · {theme === "paper" ? t("themePaper") : t("themeDark")} · {density === "compact" ? t("layoutCompact") : t("layoutComfortable")}</strong>
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

                <div className="config-section" role="group" aria-label={t("themeLabel")}>
                  <span className="config-section-label">{t("themeLabel")}</span>
                  <div className="config-options">
                    <button
                      className={`config-option${theme === "dark" ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={theme === "dark"}
                      onClick={() => setTheme("dark")}
                    >
                      {t("themeDark")}
                    </button>
                    <button
                      className={`config-option${theme === "paper" ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={theme === "paper"}
                      onClick={() => setTheme("paper")}
                    >
                      {t("themePaper")}
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
              </div>
            </details>
          </div>
        </div>

        <ProfileHero player={data.player} milestone={data.milestone} />

        <main className="dashboard-grid">
          <div className="span-7 panel-weather">
            <GameWeather weather={data.game_weather} />
          </div>
          <div className="span-5 panel-digest">
            <WeeklyDigest digest={data.weekly_digest} />
          </div>

          <div className="span-8 panel-activity">
            <ContributionMap heatmap={data.heatmap} updatedAt={data.updated_at} />
          </div>
          <div className="span-4 panel-clock">
            <GamingClock data={data.time_heatmap} />
          </div>

          <div className="span-7 panel-time">
            <TimeHeatmap data={data.time_heatmap} />
          </div>
          <div className="span-5 panel-weekday">
            <WeekdayChart data={data.weekday} heatmap={data.heatmap} />
          </div>

          <div className="span-12 panel-cloud">
            <GameCloud games={data.game_cloud} />
          </div>

          <div className="span-12 panel-stats">
            <StatsCards stats={data.stats} />
          </div>
          <div className="span-4 panel-dust">
            <DustMeter played={data.stats.played_games} never={data.stats.never_played} />
          </div>
          <div className="span-8 panel-pareto">
            <ParetoChart data={data.pareto} />
          </div>

          <div className="span-5 panel-platform">
            <PlatformPie data={data.platform} />
          </div>
          <div className="span-7 panel-recent">
            <RecentActivity activity={data.recent_activity} />
          </div>

          <div className="span-7 panel-network">
            <GameNetwork network={data.game_network} />
          </div>
          <div className="span-5 stack panel-side-stack">
            <GenreChart genres={data.genres} />
            <StayingPower games={data.game_cloud} />
          </div>

          <div className="span-12 panel-achievements">
            <AchievementBoard achievements={data.achievements} />
          </div>
        </main>
      </section>

      <section className="updates-section" id="updates" aria-label="Game update news">
        <div className="updates-heading">
          <span>Steam</span>
          <h2>{t("updateFeed")}</h2>
          <p>{t("updateFeedSubtitle")}</p>
        </div>

        <GameUpdates updates={data.game_updates ?? []} />

        <footer className="footer">
          <span>Steam Notebook - {t("updated")} {new Date(data.updated_at).toLocaleString()}</span>
        </footer>
      </section>
    </div>
  );
}

export default App;
