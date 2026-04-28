import { useMemo, useState, useCallback } from "react";
import type { StatsData, GameNetworkData, GameCloudItem } from "../types";

interface StatsProps { stats: StatsData; }
interface DustProps { played: number; never: number; }
interface StayingProps { games: GameCloudItem[]; }

export function StatsCards({ stats }: StatsProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-value">{stats.total_games}</span>
        <span className="stat-label">Total Games</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.played_games}</span>
        <span className="stat-label">Played</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.dust_rate}%</span>
        <span className="stat-label">Dust Rate</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.loyalty_score}</span>
        <span className="stat-label">Loyalty: {stats.loyalty_label}</span>
      </div>
      {stats.peak_day && (
        <div className="stat-card">
          <span className="stat-value">{(stats.peak_day.minutes / 60).toFixed(1)}h</span>
          <span className="stat-label">Peak Day ({stats.peak_day.date})</span>
        </div>
      )}
      <div className="stat-card">
        <span className="stat-value">{stats.longest_streak.days} days</span>
        <span className="stat-label">Longest Streak</span>
      </div>
    </div>
  );
}

export function DustMeter({ played, never }: DustProps) {
  const total = played + never;
  const playedPct = total > 0 ? Math.round((played / total) * 100) : 0;
  const dustPct = 100 - playedPct;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dustLength = (dustPct / 100) * circumference;

  return (
    <div className="viz-card dust-card">
      <h3>Dust Rate</h3>
      <p className="viz-subtitle">Library activation quality</p>
      <div className="dust-radial">
        <svg viewBox="0 0 140 140" className="dust-ring" aria-label={`Dust rate ${dustPct}%`}>
          <circle className="dust-ring-track" cx="70" cy="70" r={radius} />
          <circle
            className="dust-ring-played"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={`${circumference - dustLength} ${circumference}`}
          />
          <circle
            className="dust-ring-never"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={`${dustLength} ${circumference}`}
            strokeDashoffset={-(circumference - dustLength)}
          />
        </svg>
        <div className="dust-center">
          <span className="dust-percent">{dustPct}%</span>
          <span className="dust-caption">Never opened</span>
        </div>
      </div>
      <div className="dust-breakdown">
        <span><strong>{played}</strong> Played</span>
        <span><strong>{never}</strong> Never</span>
        <span><strong>{total}</strong> Total</span>
      </div>
    </div>
  );
}

export function StayingPower({ games }: StayingProps) {
  const [now] = useState(() => Date.now() / 1000);
  const withLast = games.filter((g) => g.rtime_last_played > 0);
  if (!withLast.length) return null;

  const data = withLast.slice(0, 15).map((g) => {
    const daysSince = Math.round((now - g.rtime_last_played) / 86400);
    return { appid: g.appid, name: g.name.length > 15 ? g.name.slice(0, 14) + "…" : g.name, hours: g.playtime_hours, recency: daysSince };
  }).sort((a, b) => b.hours - a.hours);

  return (
    <div className="viz-card">
      <h3>Staying Power</h3>
      <p className="viz-subtitle">Total hours vs days since last played</p>
      <div className="staying-grid">
        {data.map((g) => {
          const recencyColor = g.recency < 7 ? "#34d399" : g.recency < 30 ? "#67e8f9" : g.recency < 90 ? "#a78bfa" : "#667085";
          return (
            <div key={g.appid} className="staying-row">
              <span className="staying-name">{g.name}</span>
              <div className="staying-bar-track">
                <div className="staying-bar" style={{ width: `${Math.min((g.hours / data[0].hours) * 100, 100)}%`, background: recencyColor }} />
              </div>
              <span className="staying-hours">{g.hours}h</span>
              <span className="staying-recency" style={{ color: recencyColor }}>{g.recency === 0 ? "Today" : `${g.recency}d ago`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Game Network (Bubble graph) ──

interface Props {
  network: GameNetworkData;
}

type NetworkNodeInput = GameNetworkData["nodes"][number] | string;
type NetworkLinkInput = GameNetworkData["links"][number] | {
  source?: string | number;
  target?: string | number;
  strength?: number;
};

const GENRE_COLORS: Record<string, string> = {
  Action: "#fb7185",
  "Free To Play": "#f59e0b",
  Adventure: "#34d399",
  RPG: "#a78bfa",
  Indie: "#67e8f9",
  Strategy: "#60a5fa",
  Simulation: "#f97316",
  "Early Access": "#94a3b8",
  "Animation & Modeling": "#f472b6",
  "Design & Illustration": "#818cf8",
  Utilities: "#64748b",
  Casual: "#22c55e",
  "Video Production": "#e879f9",
  "Photo Editing": "#f0abfc",
  "Massively Multiplayer": "#8b5cf6",
};
const DEFAULT_COLOR = "#64748b";

function genreColor(genre: string): string {
  return GENRE_COLORS[genre] || DEFAULT_COLOR;
}

function firstGenre(genres: string[] | undefined): string {
  return (genres?.length ?? 0) > 0 ? genres![0] : "Other";
}

const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + "…" : s;

const BUBBLE_SLOTS = [
  { x: 320, y: 172 },
  { x: 188, y: 140 },
  { x: 452, y: 140 },
  { x: 232, y: 258 },
  { x: 408, y: 258 },
  { x: 118, y: 224 },
  { x: 522, y: 224 },
  { x: 122, y: 78 },
  { x: 518, y: 78 },
  { x: 320, y: 70 },
  { x: 320, y: 302 },
  { x: 590, y: 156 },
  { x: 50, y: 156 },
];

export function GameNetwork({ network }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const W = 640;
  const H = 380;

  const nodes = useMemo(() => {
    return (network.nodes as NetworkNodeInput[]).map((n) =>
      typeof n === "string"
        ? { appid: 0, name: n, genres: [] as string[] }
        : { appid: n.appid ?? 0, name: n.name ?? "", genres: n.genres ?? [] }
    );
  }, [network.nodes]);

  const links = useMemo(() => {
    return (network.links as NetworkLinkInput[]).map((l) => ({
      source: typeof l.source === "string" ? 0 : (l.source ?? 0),
      target: typeof l.target === "string" ? 0 : (l.target ?? 0),
      strength: l.strength ?? 1,
    }));
  }, [network.links]);

  const nodeMap = useMemo(() => {
    const m = new Map<number, { appid: number; name: string; genres: string[] }>();
    for (const n of nodes) m.set(n.appid, n);
    return m;
  }, [nodes]);

  const genreGroups = useMemo(() => {
    const m = new Map<string, { appid: number; name: string }[]>();
    for (const n of nodes) {
      const g = firstGenre(n.genres);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push({ appid: n.appid, name: n.name });
    }
    return m;
  }, [nodes]);

  const genreLinks = useMemo(() => {
    const genreLinks: { source: string; target: string; strength: number }[] = [];
    const pairMap = new Map<string, number>();

    for (const l of links) {
      const sn = nodeMap.get(l.source);
      const tn = nodeMap.get(l.target);
      if (!sn || !tn) continue;
      const sg = firstGenre(sn.genres);
      const tg = firstGenre(tn.genres);
      if (sg === tg) continue; // intra-genre, skip
      const key = sg < tg ? `${sg}|${tg}` : `${tg}|${sg}`;
      pairMap.set(key, (pairMap.get(key) || 0) + l.strength);
    }

    for (const [key, strength] of pairMap) {
      const [source, target] = key.split("|");
      genreLinks.push({ source, target, strength });
    }
    return genreLinks;
  }, [links, nodeMap]);

  const genreNames = useMemo(() => {
    return [...genreGroups.keys()].sort((a, b) => (genreGroups.get(b)?.length ?? 0) - (genreGroups.get(a)?.length ?? 0));
  }, [genreGroups]);

  const genreBubbles = useMemo(() => {
    const maxGames = Math.max(...genreNames.map((g) => genreGroups.get(g)?.length ?? 0), 1);
    return genreNames.slice(0, BUBBLE_SLOTS.length).map((name, i) => {
      const games = genreGroups.get(name) || [];
      const connections = genreLinks
        .filter((l) => l.source === name || l.target === name)
        .reduce((s, l) => s + l.strength, 0);
      const slot = BUBBLE_SLOTS[i] || BUBBLE_SLOTS[BUBBLE_SLOTS.length - 1];
      return {
        name,
        x: slot.x,
        y: slot.y,
        r: 24 + Math.sqrt(games.length / maxGames) * 38 + Math.min(connections, 12) * 0.55,
        color: genreColor(name),
        games,
        connections,
      };
    });
  }, [genreNames, genreGroups, genreLinks]);

  const genreCenterMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; r: number }>();
    for (const bubble of genreBubbles) m.set(bubble.name, { x: bubble.x, y: bubble.y, r: bubble.r });
    return m;
  }, [genreBubbles]);

  const selectedGames = useMemo(() => {
    if (!selectedGenre) return [];
    return genreGroups.get(selectedGenre) || [];
  }, [selectedGenre, genreGroups]);

  const gameDegree = useMemo(() => {
    const degree = new Map<number, number>();
    for (const l of links) {
      degree.set(l.source, (degree.get(l.source) || 0) + l.strength);
      degree.set(l.target, (degree.get(l.target) || 0) + l.strength);
    }
    return degree;
  }, [links]);

  const gameBubbles = useMemo(() => {
    const sorted = [...selectedGames].sort((a, b) => (gameDegree.get(b.appid) || 0) - (gameDegree.get(a.appid) || 0));
    const maxDegree = Math.max(...sorted.map((g) => gameDegree.get(g.appid) || 1), 1);
    return sorted.slice(0, 22).map((game, i) => {
      const angle = i === 0 ? 0 : (i - 1) * 2.399963;
      const distance = i === 0 ? 0 : 34 + Math.sqrt(i) * 25;
      return {
        ...game,
        x: W / 2 + Math.cos(angle) * distance,
        y: H / 2 + Math.sin(angle) * distance * 0.72,
        r: 18 + Math.sqrt((gameDegree.get(game.appid) || 1) / maxDegree) * 24,
        degree: gameDegree.get(game.appid) || 0,
      };
    });
  }, [selectedGames, gameDegree]);

  const gameCenterMap = useMemo(() => {
    const m = new Map<number, { x: number; y: number; r: number }>();
    for (const bubble of gameBubbles) m.set(bubble.appid, { x: bubble.x, y: bubble.y, r: bubble.r });
    return m;
  }, [gameBubbles]);

  const focusedLinks = useMemo(() => {
    if (!selectedGenre) return [];
    const gameIds = new Set(selectedGames.map((game) => game.appid));
    return links.filter((l) => gameIds.has(l.source) && gameIds.has(l.target));
  }, [selectedGenre, selectedGames, links]);

  const handleGenreClick = useCallback((genre: string) => {
    setSelectedGenre((g) => g === genre ? null : genre);
  }, []);

  if (!network.nodes.length) return <div className="viz-card"><h3>Game Network</h3><p className="viz-subtitle">Need more data - check back after a few days</p></div>;

  return (
    <div className="viz-card game-network-card">
      <h3>Game Network</h3>
      <p className="viz-subtitle">
        {selectedGenre ? (
          <>
            <button className="treemap-back" onClick={() => setSelectedGenre(null)}>Back</button>
            {selectedGenre} - {selectedGames.length} games in this cluster
          </>
        ) : (
          "Bubble size = library weight, lines = genres played in the same period"
        )}
      </p>

      <div className="network-bubble-stage">
        <svg viewBox={`0 0 ${W} ${H}`} className="network-svg">
          <defs>
            <filter id="networkGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {!selectedGenre && (
            <>
              {genreLinks.map((l, i) => {
                const source = genreCenterMap.get(l.source);
                const target = genreCenterMap.get(l.target);
                if (!source || !target) return null;
                return (
                  <line
                    key={`${l.source}-${l.target}-${i}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#67e8f9"
                    strokeWidth={Math.min(1 + l.strength * 0.55, 5)}
                    opacity={0.18}
                  />
                );
              })}
              {genreBubbles.map((bubble) => (
                <g key={bubble.name} className="network-bubble" onClick={() => handleGenreClick(bubble.name)}>
                  <circle cx={bubble.x} cy={bubble.y} r={bubble.r + 10} fill={bubble.color} opacity="0.07" />
                  <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill={bubble.color} opacity="0.26" stroke={bubble.color} strokeWidth="1.5" filter="url(#networkGlow)" />
                  <text x={bubble.x} y={bubble.y - 4} textAnchor="middle" fill="#f8fbff" fontSize="12" fontWeight="700">
                    {truncate(bubble.name, bubble.r > 48 ? 16 : 9)}
                  </text>
                  <text x={bubble.x} y={bubble.y + 12} textAnchor="middle" fill="#96a1b5" fontSize="10">
                    {bubble.games.length} games · {bubble.connections} links
                  </text>
                </g>
              ))}
            </>
          )}

          {selectedGenre && (
            <>
              {focusedLinks.map((l, i) => {
                const source = gameCenterMap.get(l.source);
                const target = gameCenterMap.get(l.target);
                if (!source || !target) return null;
                return (
                  <line
                    key={`${l.source}-${l.target}-${i}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={genreColor(selectedGenre)}
                    strokeWidth={Math.min(1 + l.strength * 0.45, 4)}
                    opacity={0.2}
                  />
                );
              })}
              {gameBubbles.map((bubble) => (
                <g key={bubble.appid} className="network-bubble">
                  <circle cx={bubble.x} cy={bubble.y} r={bubble.r + 8} fill={genreColor(selectedGenre)} opacity="0.06" />
                  <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill={genreColor(selectedGenre)} opacity="0.3" stroke={genreColor(selectedGenre)} strokeWidth="1.4" />
                  <text x={bubble.x} y={bubble.y - 3} textAnchor="middle" fill="#f8fbff" fontSize="10" fontWeight="700">
                    {truncate(bubble.name, bubble.r > 35 ? 13 : 8)}
                  </text>
                  {bubble.degree > 0 && (
                    <text x={bubble.x} y={bubble.y + 12} textAnchor="middle" fill="#96a1b5" fontSize="9">
                      {bubble.degree} links
                    </text>
                  )}
                </g>
              ))}
            </>
          )}
        </svg>
      </div>

      {!selectedGenre && (
        <div className="treemap-legend network-legend">
          {genreBubbles.slice(0, 8).map((g) => (
            <span key={g.name} className="treemap-legend-item" onClick={() => handleGenreClick(g.name)}>
              <span className="treemap-legend-dot" style={{ background: g.color }} />
              {g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
