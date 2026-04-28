import { useMemo, useState } from "react";
import { forceSimulation, forceManyBody, forceCollide, forceCenter } from "d3-force";
import type { GameCloudItem } from "../types";

interface Props {
  games: GameCloudItem[];
}

function steamImgUrl(appid: number, iconHash: string) {
  if (!iconHash) return "";
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

interface Node {
  id: number;
  game: GameCloudItem;
  radius: number;
  mass: number;
  x: number;
  y: number;
  rank: number;
}

function computeLayout(games: GameCloudItem[]): Node[] {
  const width = 800, height = 560;
  const maxHours = games[0]?.playtime_hours ?? 1;

  const nodes: Node[] = games.map((game, i) => {
    const ratio = Math.sqrt(game.playtime_hours) / Math.sqrt(maxHours);
    const radius = Math.max(14, Math.round(ratio * 80));
    return {
      id: game.appid,
      game,
      radius,
      mass: Math.max(1, game.playtime_hours),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      rank: i + 1,
    };
  });

  // Run simulation to completion (no animation)
  forceSimulation<Node>(nodes)
    .force("charge", forceManyBody<Node>()
      .strength((d) => Math.sqrt(d.mass) * 0.8)
    )
    .force("collision", forceCollide<Node>()
      .radius((d) => d.radius + 4)
      .strength(1)
    )
    .force("center", forceCenter(width / 2, height / 2))
    .alphaDecay(0.02)
    .velocityDecay(0.4)
    .stop();

  // Tick until settled
  for (let i = 0; i < 300; i++) {
    (nodes as any).simulation?.tick?.();
    // Manual tick via d3 internal
  }

  // Actually d3 stop() prevents on("tick"), so we use alpha manually
  const sim = forceSimulation<Node>(nodes)
    .force("charge", forceManyBody<Node>()
      .strength((d) => Math.sqrt(d.mass) * 0.8)
    )
    .force("collision", forceCollide<Node>()
      .radius((d) => d.radius + 4)
      .strength(1)
    )
    .force("center", forceCenter(width / 2, height / 2))
    .alphaDecay(0.02)
    .velocityDecay(0.4)
    .stop();

  // Tick 300 times synchronously to get final positions
  for (let i = 0; i < 300; i++) sim.tick();

  // Clamp to bounds
  for (const n of nodes) {
    n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
    n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
  }

  return nodes;
}

export function GameCloud({ games }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; name: string; hours: number; rank: number } | null>(null);

  const nodes = useMemo(() => computeLayout(games), [games]);
  const maxHours = games[0]?.playtime_hours ?? 1;

  if (!games.length) return <p style={{ color: "#005500", fontFamily: "monospace" }}>No games data yet.</p>;

  return (
    <div className="game-cloud">
      <h2>Game Cloud</h2>
      <p className="subtitle">{games.length} games — mass = playtime, gravity pulls them together</p>

      <div className="gravity-container">
        <div className="gravity-field">
          {nodes.map((n) => {
            const size = n.radius * 2;
            const ratio = n.game.playtime_hours / maxHours;
            return (
              <div
                key={n.id}
                className="cloud-item static-item"
                style={{
                  width: size,
                  height: size,
                  left: n.x - n.radius,
                  top: n.y - n.radius,
                  opacity: 0.3 + 0.7 * ratio,
                  zIndex: hover && hover.rank === n.rank ? 10 : 1,
                }}
                onMouseEnter={() => setHover({ x: n.x, y: n.y - n.radius - 12, name: n.game.name, hours: n.game.playtime_hours, rank: n.rank })}
                onMouseLeave={() => setHover(null)}
              >
                {n.game.img_icon_url ? (
                  <img src={steamImgUrl(n.game.appid, n.game.img_icon_url)} alt={n.game.name} width={size} height={size} />
                ) : (
                  <span className="cloud-letter" style={{ fontSize: n.radius * 0.7 }}>{n.game.name[0]}</span>
                )}
              </div>
            );
          })}
        </div>

        {hover && (
          <div
            className="cloud-tooltip"
            style={{ left: Math.min(hover.x, 780 - 150), top: Math.max(hover.y, 10) }}
          >
            <span className="cloud-tooltip-rank">#{hover.rank}</span>
            <span className="cloud-tooltip-name">{hover.name}</span>
            <span className="cloud-tooltip-hours">{hover.hours}h</span>
          </div>
        )}
      </div>
    </div>
  );
}
