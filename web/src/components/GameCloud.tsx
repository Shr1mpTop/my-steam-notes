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
  opacity: number;
}

export function GameCloud({ games }: Props) {
  const width = 800, height = 560;
  const [nodes, setNodes] = useState<Node[]>([]);
  const rafRef = useRef<number>(0);
  const simRef = useRef<ReturnType<typeof forceSimulation<Node>> | null>(null);

  const maxHours = games[0]?.playtime_hours ?? 1;

  // Build nodes from ALL games
  const allNodes: Node[] = games.map((game, i) => {
    const logR = Math.log(game.playtime_hours + 1) / Math.log(maxHours + 1);
    const radius = i === 0
      ? 52
      : Math.max(5, Math.round(Math.pow(logR, 0.55) * 36));
    return {
      id: game.appid,
      game,
      radius,
      mass: Math.max(1, game.playtime_hours),
      x: width / 2 + (Math.random() - 0.5) * 600,
      y: height / 2 + (Math.random() - 0.5) * 400,
      rank: i + 1,
      opacity: 0.3 + 0.7 * (game.playtime_hours / maxHours),
    };
  });

  // D3 force simulation
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
        // Clamp to bounds
        for (const n of allNodes) {
          n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
          n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
        }
        setNodes([...allNodes]);
      });

    simRef.current = sim;

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [games]);

  if (!games.length) return <p style={{ color: "#005500", fontFamily: "monospace" }}>No games data yet.</p>;

  return (
    <div className="game-cloud">
      <h2>Game Cloud</h2>
      <p className="subtitle">{games.length} games — mass = playtime, gravity pulls them together</p>

      <div className="gravity-container">
        <div className="gravity-core" />
        <div className="gravity-field">
          {nodes.map((n) => {
            const size = n.radius * 2;
            return (
              <div
                key={n.id}
                className="cloud-item gravity-item"
                style={{
                  width: size,
                  height: size,
                  left: n.x - n.radius,
                  top: n.y - n.radius,
                  opacity: n.opacity,
                }}
                title={`${n.game.name}: ${n.game.playtime_hours}h`}
              >
                {n.rank <= 3 && <span className="cloud-rank">#{n.rank}</span>}
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
                {n.radius >= 36 && (
                  <span className="cloud-label">
                    {n.game.name.length > 12 ? n.game.name.slice(0, 11) + "…" : n.game.name}
                    <br />
                    {n.game.playtime_hours}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
