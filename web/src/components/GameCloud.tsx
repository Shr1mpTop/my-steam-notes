import { useRef, useEffect, useMemo, useState } from "react";
import type { GameCloudItem } from "../types";

interface Props {
  games: GameCloudItem[];
}

function steamImgUrl(appid: number, iconHash: string) {
  if (!iconHash) return "";
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

interface Body {
  game: GameCloudItem;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  rank: number;
}

export function GameCloud({ games }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bodies, setBodies] = useState<Body[]>([]);
  const rafRef = useRef<number>(0);

  const top = useMemo(() => games.slice(0, 40), [games]);
  const rest = useMemo(() => games.slice(40, 90), [games]);
  const maxHours = games[0]?.playtime_hours ?? 1;

  // Initialize bodies
  useEffect(() => {
    if (!top.length) return;

    const sorted = [...top].sort((a, b) => b.playtime_hours - a.playtime_hours);
    const cx = 400, cy = 260;

    const initial: Body[] = sorted.map((game, i) => {
      const logR = Math.log(game.playtime_hours + 1) / Math.log(maxHours + 1);
      const radius = i === 0 ? 56 : Math.max(10, Math.round(Math.pow(logR, 0.5) * 38));
      const mass = Math.max(1, game.playtime_hours);

      // Start scattered randomly
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 250;
      return {
        game,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius,
        mass,
        rank: i + 1,
      };
    });

    setBodies(initial);
  }, [top, maxHours]);

  // Physics simulation
  useEffect(() => {
    if (!bodies.length) return;

    const G = 800;        // gravitational constant
    const DAMPING = 0.92;  // velocity damping per frame
    const REPULSE = 1.5;   // collision repulsion strength
    const CENTER_PULL = 0.00004; // gentle pull toward center
    const cx = 400, cy = 260;

    let frame = 0;
    const maxFrames = 300;
    let current = [...bodies];

    function step() {
      frame++;
      const next = current.map((b, i) => {
        let fx = 0, fy = 0;

        for (let j = 0; j < current.length; j++) {
          if (i === j) continue;
          const other = current[j];
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;

          // Gravitational attraction: F = G * m1 * m2 / r^2
          const minDist = b.radius + other.radius;
          if (dist > minDist * 0.5) {
            const force = G * b.mass * other.mass / (distSq + 100);
            fx += (dx / dist) * force / b.mass;
            fy += (dy / dist) * force / b.mass;
          }

          // Collision repulsion
          const overlap = minDist - dist;
          if (overlap > 0) {
            const repulse = overlap * REPULSE;
            fx -= (dx / dist) * repulse;
            fy -= (dy / dist) * repulse;
          }
        }

        // Gentle center pull (prevents drift)
        fx += (cx - b.x) * CENTER_PULL * b.mass;
        fy += (cy - b.y) * CENTER_PULL * b.mass;

        // Update velocity
        const damping = frame < maxFrames ? DAMPING : 0.5;
        let vx = (b.vx + fx) * damping;
        let vy = (b.vy + fy) * damping;

        // Update position
        let x = b.x + vx;
        let y = b.y + vy;

        // Boundary containment
        x = Math.max(b.radius, Math.min(800 - b.radius, x));
        y = Math.max(b.radius, Math.min(520 - b.radius, y));

        return { ...b, x, y, vx, vy };
      });

      current = next;
      setBodies(next);

      if (frame < maxFrames) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [bodies.length > 0]); // only re-run when bodies first appear

  if (!games.length) return <p style={{ color: "#005500", fontFamily: "monospace" }}>No games data yet.</p>;

  return (
    <div className="game-cloud">
      <h2>Game Cloud</h2>
      <p className="subtitle">{games.length} games — gravitational simulation, mass = playtime</p>

      <div className="gravity-container" ref={containerRef}>
        <div className="gravity-core" />
        <div className="gravity-field">
          {bodies.map((b) => (
            <div
              key={b.game.appid}
              className="cloud-item gravity-item"
              style={{
                width: b.radius * 2,
                height: b.radius * 2,
                left: b.x - b.radius,
                top: b.y - b.radius,
                opacity: 0.4 + 0.6 * (b.game.playtime_hours / maxHours),
              }}
              title={`${b.game.name}: ${b.game.playtime_hours}h`}
            >
              {b.rank <= 3 && <span className="cloud-rank">#{b.rank}</span>}
              {b.game.img_icon_url ? (
                <img
                  src={steamImgUrl(b.game.appid, b.game.img_icon_url)}
                  alt={b.game.name}
                  width={b.radius * 2}
                  height={b.radius * 2}
                />
              ) : (
                <span className="cloud-letter" style={{ fontSize: b.radius * 0.8 }}>
                  {b.game.name[0]}
                </span>
              )}
              {b.radius >= 40 && (
                <span className="cloud-label">
                  {b.game.name.length > 12 ? b.game.name.slice(0, 11) + "…" : b.game.name}
                  <br />
                  {b.game.playtime_hours}h
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {rest.length > 0 && (
        <>
          <p className="cloud-more">+ {games.length - 40} more in orbit</p>
          <div className="cloud-strip">
            {rest.map((game) => (
              <div key={game.appid} className="cloud-item tiny" title={`${game.name}: ${game.playtime_hours}h`}>
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
