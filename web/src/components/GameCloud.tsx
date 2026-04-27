import { useRef, useEffect, useState } from "react";
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

export function GameCloud({ games }: Props) {
  const width = 800, height = 560;
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number; name: string; hours: number; rank: number } | null>(null);
  const rafRef = useRef<number>(0);

  const maxHours = games[0]?.playtime_hours ?? 1;

  const allNodes: Node[] = games.map((game, i) => {
    // Aggressive scaling: top game = 60px radius, smallest = 4px
    // Sqrt scaling: balanced contrast, not too extreme
    const ratio = Math.sqrt(game.playtime_hours) / Math.sqrt(maxHours);
    const radius = Math.max(10, Math.round(ratio * 64));
    return {
      id: game.appid,
      game,
      radius,
      mass: Math.max(1, game.playtime_hours),
      x: width / 2 + (Math.random() - 0.5) * 600,
      y: height / 2 + (Math.random() - 0.5) * 400,
      rank: i + 1,
    };
  });

  useEffect(() => {
    if (!allNodes.length) return;

    const sim = forceSimulation<Node>(allNodes)
      .force("charge", forceManyBody<Node>()
        .strength((d) => Math.sqrt(d.mass) * 0.8)
      )
      .force("collision", forceCollide<Node>()
        .radius((d) => d.radius + 1.5)
        .strength(0.9)
      )
      .force("center", forceCenter(width / 2, height / 2))
      .alphaDecay(0.015)
      .velocityDecay(0.4)
      .on("tick", () => {
        for (const n of allNodes) {
          n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
          n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
        }
        setNodes([...allNodes]);
      });

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [games]);

  const handleMouseEnter = (n: Node) => {
    setHover({
      x: n.x,
      y: n.y - n.radius - 12,
      name: n.game.name,
      hours: n.game.playtime_hours,
      rank: n.rank,
    });
  };

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
                className="cloud-item gravity-item"
                style={{
                  width: size,
                  height: size,
                  left: n.x - n.radius,
                  top: n.y - n.radius,
                  opacity: 0.3 + 0.7 * ratio,
                  zIndex: hover && hover.rank === n.rank ? 10 : 1,
                }}
                onMouseEnter={() => handleMouseEnter(n)}
                onMouseLeave={() => setHover(null)}
              >
                {n.game.img_icon_url ? (
                  <img
                    src={steamImgUrl(n.game.appid, n.game.img_icon_url)}
                    alt={n.game.name}
                    width={size}
                    height={size}
                  />
                ) : (
                  <span className="cloud-letter" style={{ fontSize: n.radius * 0.7 }}>
                    {n.game.name[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {hover && (
          <div
            className="cloud-tooltip"
            style={{
              left: Math.min(hover.x, width - 160),
              top: Math.max(hover.y, 10),
            }}
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
