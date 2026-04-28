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
import "./App.css";

function App() {
  const { data, loading, error } = useDashboard();

  if (loading) return <div className="loading">Loading your Steam universe...</div>;
  if (error) return <div className="error">Failed to load data: {error}</div>;
  if (!data) return null;

  return (
    <div className="app">
      {/* Header / Profile */}
      <ProfileHero player={data.player} milestone={data.milestone} />

      <div className="divider" />

      {/* Fun Widgets Row */}
      <div className="two-col">
        <GameWeather weather={data.game_weather} />
        <WeeklyDigest digest={data.weekly_digest} />
      </div>

      <div className="divider" />

      {/* ── Time Analytics (front and center) ── */}
      <ContributionMap heatmap={data.heatmap} />

      <div className="divider" />

      <div className="two-col">
        <TimeHeatmap data={data.time_heatmap} />
        <WeekdayChart data={data.weekday} />
      </div>

      <div className="centered">
        <GamingClock data={data.time_heatmap} />
      </div>

      <div className="divider" />

      {/* Game Cloud (TreeMap) */}
      <GameCloud games={data.game_cloud} />

      <div className="divider" />

      {/* Stats Overview */}
      <StatsCards stats={data.stats} />
      <div className="two-col">
        <DustMeter played={data.stats.played_games} never={data.stats.never_played} />
        <div /> {/* spacer */}
      </div>

      <div className="divider" />

      {/* Rankings */}
      <div className="two-col">
        <ParetoChart data={data.pareto} />
        <PlatformPie data={data.platform} />
      </div>

      <div className="divider" />

      {/* Recent Activity + Game Network */}
      <div className="two-col">
        <RecentActivity activity={data.recent_activity} />
        <GameNetwork network={data.game_network} />
      </div>

      <div className="divider" />

      {/* Genre + Staying Power */}
      <div className="two-col">
        <GenreChart genres={data.genres} />
        <StayingPower games={data.game_cloud} />
      </div>

      <div className="divider" />

      {/* Achievements */}
      <AchievementBoard achievements={data.achievements} />

      <footer className="footer">
        <span>Steam Notebook — Updated {new Date(data.updated_at).toLocaleString()}</span>
      </footer>
    </div>
  );
}

export default App;
