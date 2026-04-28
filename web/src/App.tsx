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
import { LandingExperience } from "./components/LandingExperience";
import "./App.css";

function App() {
  const { data, loading, error } = useDashboard();

  if (loading) return <div className="loading">Loading your Steam universe...</div>;
  if (error) return <div className="error">Failed to load data: {error}</div>;
  if (!data) return null;

  return (
    <div className="app" id="top">
      <LandingExperience data={data} />

      <section className="dashboard-shell" id="dashboard" aria-label="Steam data console">
        <ProfileHero player={data.player} milestone={data.milestone} />

        <main className="dashboard-grid">
          <div className="span-7">
            <GameWeather weather={data.game_weather} />
          </div>
          <div className="span-5">
            <WeeklyDigest digest={data.weekly_digest} />
          </div>

          <div className="span-12">
            <GameUpdates updates={data.game_updates ?? []} />
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

        <footer className="footer">
          <span>Steam Notebook — Updated {new Date(data.updated_at).toLocaleString()}</span>
        </footer>
      </section>
    </div>
  );
}

export default App;
