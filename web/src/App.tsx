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
import { useLocale } from "./i18n";
import "./App.css";

function App() {
  const { data, loading, error } = useDashboard();
  const { locale, toggleLocale, t } = useLocale();

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
          <button className="locale-toggle" type="button" onClick={toggleLocale} aria-label={t("switchLabel")}>
            <span>{t("switchLabel")}</span>
            <strong>{locale === "zh" ? "中文" : "EN"}</strong>
          </button>
        </div>

        <ProfileHero player={data.player} milestone={data.milestone} />

        <main className="dashboard-grid">
          <div className="span-7">
            <GameWeather weather={data.game_weather} />
          </div>
          <div className="span-5">
            <WeeklyDigest digest={data.weekly_digest} />
          </div>

          <div className="span-8">
            <ContributionMap heatmap={data.heatmap} />
          </div>
          <div className="span-4">
            <GamingClock data={data.time_heatmap} />
          </div>

          <div className="span-7">
            <TimeHeatmap data={data.time_heatmap} />
          </div>
          <div className="span-5">
            <WeekdayChart data={data.weekday} heatmap={data.heatmap} />
          </div>

          <div className="span-12">
            <GameCloud games={data.game_cloud} />
          </div>

          <div className="span-12">
            <StatsCards stats={data.stats} />
          </div>
          <div className="span-4">
            <DustMeter played={data.stats.played_games} never={data.stats.never_played} />
          </div>
          <div className="span-8">
            <ParetoChart data={data.pareto} />
          </div>

          <div className="span-5">
            <PlatformPie data={data.platform} />
          </div>
          <div className="span-7">
            <RecentActivity activity={data.recent_activity} />
          </div>

          <div className="span-7">
            <GameNetwork network={data.game_network} />
          </div>
          <div className="span-5 stack">
            <GenreChart genres={data.genres} />
            <StayingPower games={data.game_cloud} />
          </div>

          <div className="span-12">
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
