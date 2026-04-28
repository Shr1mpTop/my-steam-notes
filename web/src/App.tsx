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

      <section className="dashboard-shell cinematic-dashboard" id="dashboard" aria-label="Steam data observatory">
        <div className="dashboard-intro">
          <span>Data Observatory</span>
          <h2>数据舱：真正有用的部分</h2>
          <p>这里保留所有可交互分析：热力图、时间模式、游戏云、80/20 曲线、网络、成就和更新。背景只负责氛围，判断交给数据。</p>
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
          <span>Steam Update Feed</span>
          <h2>游戏开发更新与新闻动态</h2>
          <p>滚动叙事结束后，把最近抓取到的 Steam 更新统一收束在页面最后。</p>
        </div>

        <GameUpdates updates={data.game_updates ?? []} />

        <footer className="footer">
          <span>Steam Notebook — Updated {new Date(data.updated_at).toLocaleString()}</span>
        </footer>
      </section>
    </div>
  );
}

export default App;
