import type { AchievementGame, GenreItem } from "../types";

interface Props { achievements: AchievementGame[]; }
interface GenreProps { genres: GenreItem[]; }

export function AchievementBoard({ achievements }: Props) {
  if (!achievements.length) return null;

  const completed = achievements.filter((a) => a.pct === 100);
  const totalAchievements = achievements.reduce((s, a) => s + a.total, 0);
  const totalUnlocked = achievements.reduce((s, a) => s + a.unlocked, 0);

  return (
    <div className="viz-card">
      <h3>Achievement Board</h3>
      <p className="viz-subtitle">{totalUnlocked}/{totalAchievements} unlocked across {achievements.length} games — {completed.length} games 100% completed</p>
      <div className="achievement-grid">
        {achievements.map((game) => (
          <div key={game.appid} className="achievement-card">
            <div className="achievement-header">
              <span className="achievement-game">{game.name}</span>
              <span className="achievement-count">{game.unlocked}/{game.total}</span>
            </div>
            <div className="achievement-bar-track">
              <div
                className="achievement-bar-fill"
                style={{
                  width: `${game.pct}%`,
                  background: game.pct === 100
                    ? "linear-gradient(90deg, #ffd700, #f59e0b)"
                    : game.pct >= 50
                      ? "#39d353"
                      : "#6366f1",
                }}
              />
            </div>
            <span className="achievement-pct">{game.pct}%</span>
            {game.rare.length > 0 && (
              <div className="rare-achievements">
                {game.rare.slice(0, 2).map((r) => (
                  <span key={r.name} className="rare-tag" title={`Only ${r.global_pct}% of players have this`}>
                    {r.name.replace(/_/g, " ")} ({r.global_pct.toFixed(1)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenreChart({ genres }: GenreProps) {
  if (!genres.length) return null;

  const maxHours = Math.max(...genres.map((g) => g.hours));
  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#06b6d4", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#f97316", "#22d3ee", "#a3e635", "#e879f9", "#fb923c", "#38bdf8"];

  return (
    <div className="viz-card">
      <h3>Genre Distribution</h3>
      <p className="viz-subtitle">Hours by game genre</p>
      <div className="genre-chart">
        {genres.slice(0, 10).map((g, i) => (
          <div key={g.genre} className="genre-row">
            <span className="genre-name">{g.genre}</span>
            <div className="genre-bar-track">
              <div className="genre-bar-fill" style={{ width: `${(g.hours / maxHours) * 100}%`, background: COLORS[i % COLORS.length] }} />
            </div>
            <span className="genre-hours">{g.hours.toFixed(0)}h</span>
            <span className="genre-count">{g.games} games</span>
          </div>
        ))}
      </div>
    </div>
  );
}
