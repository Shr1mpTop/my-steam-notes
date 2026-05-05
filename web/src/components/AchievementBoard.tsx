import type { AchievementGame, GenreItem } from "../types";
import { useLocale } from "../useLocale";

interface Props { achievements: AchievementGame[]; }
interface GenreProps { genres: GenreItem[]; }

export function AchievementBoard({ achievements }: Props) {
  const { t } = useLocale();
  if (!achievements.length) return null;

  const completed = achievements.filter((a) => a.pct === 100);
  const totalAchievements = achievements.reduce((s, a) => s + a.total, 0);
  const totalUnlocked = achievements.reduce((s, a) => s + a.unlocked, 0);

  return (
    <div className="viz-card">
      <h3>{t("achievementBoard")}</h3>
      <p className="viz-subtitle">{totalUnlocked}/{totalAchievements} {t("unlocked")} · {achievements.length} {t("games")} · {completed.length} {t("completed")}</p>
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
                    ? "var(--success)"
                    : game.pct >= 50
                      ? "var(--accent)"
                      : "var(--accent-2)",
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
  const { t } = useLocale();
  if (!genres.length) return null;

  const maxHours = Math.max(...genres.map((g) => g.hours));
  const COLORS = [
    "var(--palette-0)",
    "var(--palette-1)",
    "var(--palette-2)",
    "var(--palette-3)",
    "var(--palette-4)",
    "var(--palette-5)",
    "var(--palette-6)",
    "var(--palette-7)",
    "var(--palette-8)",
    "var(--palette-9)",
  ];

  return (
    <div className="viz-card">
      <h3>{t("genreDistribution")}</h3>
      <p className="viz-subtitle">{t("genreSubtitle")}</p>
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
