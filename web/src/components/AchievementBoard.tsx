import type { AchievementGame, GenreItem } from "../types";
import { useLocale } from "../useLocale";
import { genreColor } from "../lib/palette";
import { GameCover } from "./GameImages";
import { Panel, Reveal } from "./ui";

interface Props { achievements: AchievementGame[]; }
interface GenreProps { genres: GenreItem[]; }

export function AchievementBoard({ achievements }: Props) {
  const { t } = useLocale();
  if (!achievements.length) return null;

  const completed = achievements.filter((a) => a.pct === 100);
  const totalAchievements = achievements.reduce((s, a) => s + a.total, 0);
  const totalUnlocked = achievements.reduce((s, a) => s + a.unlocked, 0);

  return (
    <Panel
      kicker={t("kickAchievements")}
      title={t("achievementBoard")}
      sub={`${totalUnlocked}/${totalAchievements} ${t("unlocked")} · ${achievements.length} ${t("games")} · ${completed.length} ${t("completed")}`}
      delay={0.2}
    >
      <div className="achievement-grid">
        {achievements.map((game, i) => (
          <Reveal key={game.appid} delay={Math.min(i * 0.025, 0.3)} className="achievement-cell">
            <div className="achievement-card">
              <div className="achievement-header">
                <span className="achievement-game">{game.name}</span>
                <span className="achievement-count">{game.unlocked}/{game.total}</span>
              </div>
              <div className="achievement-bar-track">
                <div
                  className={`achievement-bar-fill${game.pct === 100 ? " is-complete" : ""}`}
                  style={{ width: `${game.pct}%` }}
                />
              </div>
              <span className="achievement-pct">{game.pct}%</span>
              {game.rare.length > 0 && (
                <div className="rare-achievements">
                  {game.rare.slice(0, 4).map((r) => (
                    <span
                      key={r.name}
                      className="rare-tag"
                      title={`Only ${r.global_pct}% of players have this`}
                    >
                      {r.name.replace(/_/g, " ")} ({r.global_pct.toFixed(1)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Instagram-style photo wall: one portrait cover per game with the
 * achievement progress printed over the photo. Renders as masonry items
 * inside the page-level .wall container.
 */
export function AchievementWall({ achievements }: Props) {
  if (!achievements.length) return null;
  const sorted = [...achievements].sort((a, b) => b.playtime_hours - a.playtime_hours);
  return (
    <>
      {sorted.map((game, i) => (
        <Reveal key={game.appid} delay={Math.min(i * 0.02, 0.25)} className="wall-item">
          <a
            className={`wall-card${game.pct === 100 ? " is-complete" : ""}`}
            href={`https://steamcommunity.com/stats/${game.appid}/achievements`}
            target="_blank"
            rel="noreferrer"
            title={`${game.name} — ${game.pct}%`}
          >
            <GameCover appid={game.appid} name={game.name} variant="portrait" />
            <div className="wall-overlay">
              <span className="wall-name">{game.name}</span>
              <div className="wall-bar">
                <div
                  className={`wall-bar-fill${game.pct === 100 ? " is-complete" : ""}`}
                  style={{ width: `${game.pct}%` }}
                />
              </div>
              <div className="wall-pct-row">
                <span>{game.unlocked}/{game.total}</span>
                <span>{game.pct}%</span>
              </div>
            </div>
          </a>
        </Reveal>
      ))}
    </>
  );
}

export function GenreChart({ genres }: GenreProps) {
  const { t } = useLocale();
  if (!genres.length) return null;

  const maxHours = Math.max(...genres.map((g) => g.hours));

  return (
    <Panel kicker={t("kickGenres")} title={t("genreDistribution")} sub={t("genreSubtitle")} delay={0.22}>
      <div className="genre-chart">
        {genres.map((g) => (
          <div key={g.genre} className="genre-row">
            <span className="genre-name">{g.genre}</span>
            <div className="genre-bar-track">
              <div
                className="genre-bar-fill"
                style={{ width: `${(g.hours / maxHours) * 100}%`, background: genreColor(g.genre) }}
              />
            </div>
            <span className="genre-hours">{g.hours.toFixed(0)}h</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
