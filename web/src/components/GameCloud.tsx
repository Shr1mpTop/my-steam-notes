import { useMemo } from "react";
import type { GameCloudItem } from "../types";

interface Props {
  games: GameCloudItem[];
}

function steamImgUrl(appid: number, iconHash: string) {
  if (!iconHash) return "";
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

interface PositionedGame {
  game: GameCloudItem;
  x: number;
  y: number;
  size: number;
  rank: number;
}

function computeGravityLayout(games: GameCloudItem[]): PositionedGame[] {
  if (!games.length) return [];

  const maxHours = Math.max(...games.map((g) => g.playtime_hours));
  const cx = 400, cy = 280; // center of the viewport
  const results: PositionedGame[] = [];

  // Sort by playtime descending — biggest first = closest to center
  const sorted = [...games].sort((a, b) => b.playtime_hours - a.playtime_hours);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5° for sunflower distribution

  sorted.forEach((game, i) => {
    const t = i / (sorted.length - 1 || 1); // 0 = top game, 1 = least played

    // Size: power curve for strong contrast
    const logRatio = Math.log(game.playtime_hours + 1) / Math.log(maxHours + 1);
    const size = i === 0 ? 120 : Math.max(16, Math.round(Math.pow(logRatio, 0.6) * 90));

    // Radius: top game at center, spreading outward
    // Use sqrt for uniform area distribution (like galaxy arms)
    const minR = size * 0.6;
    const maxR = Math.min(cx, cy) - size / 2 - 10;
    const baseR = minR + Math.sqrt(t) * (maxR - minR);

    // Angle: golden angle spiral + slight jitter
    const angle = i * goldenAngle + (Math.sin(i * 7.3) * 0.15);
    const jitter = Math.sin(i * 13.7) * size * 0.3;
    const r = baseR + jitter;

    results.push({
      game,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      size,
      rank: i + 1,
    });
  });

  return results;
}

export function GameCloud({ games }: Props) {
  if (!games.length) return <p style={{ color: "#005500", fontFamily: "monospace" }}>No games data yet.</p>;

  const top30 = games.slice(0, 30);
  const positioned = useMemo(() => computeGravityLayout(top30), [top30]);
  const rest = games.slice(30, 80);

  return (
    <div className="game-cloud">
      <h2>Game Cloud</h2>
      <p className="subtitle">{games.length} games played — gravity pulls the most played to the core</p>

      <div className="gravity-container">
        {/* Center glow */}
        <div className="gravity-core" />

        <svg className="gravity-svg" viewBox="0 0 800 560">
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00ff41" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00ff41" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="400" cy="280" r="200" fill="url(#coreGlow)" />
        </svg>

        <div className="gravity-field">
          {positioned.map((p) => (
            <GravityItem key={p.game.appid} {...p} maxHours={games[0].playtime_hours} />
          ))}
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <p className="cloud-more">+ {games.length - 30} more in orbit</p>
          <div className="cloud-strip">
            {rest.map((game) => (
              <div
                key={game.appid}
                className="cloud-item tiny"
                title={`${game.name}: ${game.playtime_hours}h`}
              >
                {game.img_icon_url ? (
                  <img src={steamImgUrl(game.appid, game.img_icon_url)} alt={game.name} />
                ) : (
                  <span>{game.name[0]}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GravityItem({ game, x, y, size, rank, maxHours }: PositionedGame & { maxHours: number }) {
  const imgUrl = steamImgUrl(game.appid, game.img_icon_url);
  const opacity = 0.35 + 0.65 * (game.playtime_hours / maxHours);

  return (
    <div
      className="cloud-item gravity-item"
      style={{
        width: size,
        height: size,
        left: x - size / 2,
        top: y - size / 2,
        opacity,
        animationDelay: `${rank * 30}ms`,
      }}
      title={`${game.name}: ${game.playtime_hours}h`}
    >
      {rank <= 3 && <span className="cloud-rank">#{rank}</span>}
      {imgUrl ? (
        <img src={imgUrl} alt={game.name} width={size} height={size} />
      ) : (
        <span className="cloud-letter" style={{ fontSize: size * 0.35 }}>
          {game.name[0]}
        </span>
      )}
      {size >= 64 && (
        <span className="cloud-label">
          {game.name.length > 14 ? game.name.slice(0, 13) + "…" : game.name}
          <br />
          {game.playtime_hours}h
        </span>
      )}
    </div>
  );
}
