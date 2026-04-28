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
  const pct = total > 0 ? Math.round((played / total) * 100) : 0;
  return (
    <div className="viz-card">
      <h3>Dust Rate</h3>
      <p className="viz-subtitle">{never} games never opened</p>
      <div className="dust-bar-track">
        <div className="dust-bar-played" style={{ width: `${pct}%` }} />
      </div>
      <div className="dust-labels">
        <span>Played {played} ({pct}%)</span>
        <span>Never {never} ({100 - pct}%)</span>
      </div>
    </div>
  );
}

export function StayingPower({ games }: StayingProps) {
  const withLast = games.filter((g) => g.rtime_last_played > 0);
  if (!withLast.length) return null;

  const now = Date.now() / 1000;
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
          const recencyColor = g.recency < 7 ? "#00ff41" : g.recency < 30 ? "#00cc33" : g.recency < 90 ? "#009926" : "#006619";
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

// ── Game Network (TreeMap-style) ──

interface Props {
  network: GameNetworkData;
}

const GENRE_COLORS: Record<string, string> = {
  Action: "#e74c3c",
  "Free To Play": "#f39c12",
  Adventure: "#27ae60",
  RPG: "#8e44ad",
  Indie: "#3498db",
  Strategy: "#1abc9c",
  Simulation: "#e67e22",
  "Early Access": "#95a5a6",
  "Animation & Modeling": "#d35400",
  "Design & Illustration": "#c0392b",
  Utilities: "#7f8c8d",
  Casual: "#2ecc71",
  "Video Production": "#e84393",
  "Photo Editing": "#fd79a8",
  "Massively Multiplayer": "#6c5ce7",
};
const DEFAULT_COLOR = "#636e72";

function genreColor(genre: string): string {
  return GENRE_COLORS[genre] || DEFAULT_COLOR;
}

// --- Layout: treemap blocks for genres ---
interface Rect { x: number; y: number; w: number; h: number }

interface GenreBlock {
  name: string;
  color: string;
  games: { appid: number; name: string }[];
  connections: number; // total link strength to other genres
  rect: Rect;
}

function firstGenre(genres: string[]): string {
  return genres.length > 0 ? genres[0] : "Other";
}

// Binary tree split (same as GameCloud)
interface LayoutItem {
  x: number; y: number; w: number; h: number;
  name: string; value: number; color: string;
}

function treemapLayout(
  items: { name: string; value: number; color: string }[],
  rect: Rect,
): LayoutItem[] {
  if (!items.length) return [];
  const sorted = items.map((it, i) => ({ ...it, idx: i })).sort((a, b) => b.value - a.value);
  const results: LayoutItem[] = new Array(items.length);
  doSplit(sorted, rect, results, rect.w >= rect.h);
  return results;
}

function doSplit(
  items: { name: string; value: number; color: string; idx: number }[],
  rect: Rect, results: LayoutItem[], horizontal: boolean,
) {
  if (!items.length) return;
  if (items.length === 1) {
    results[items[0].idx] = { ...rect, name: items[0].name, value: items[0].value, color: items[0].color };
    return;
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) { items.forEach(it => { results[it.idx] = { ...rect, name: it.name, value: 0, color: it.color }; }); return; }

  let cum = 0, si = 0, best = total;
  for (let i = 0; i < items.length - 1; i++) {
    cum += items[i].value;
    const d = Math.abs(2 * cum - total);
    if (d <= best) { best = d; si = i; } else break;
  }
  const left = items.slice(0, si + 1), right = items.slice(si + 1);
  const lv = left.reduce((s, i) => s + i.value, 0), frac = lv / total;
  const { x, y, w, h } = rect;

  const lr: Rect = horizontal ? { x, y, w: w * frac, h } : { x, y, w, h: h * frac };
  const rr: Rect = horizontal ? { x: x + w * frac, y, w: w * (1 - frac), h } : { x, y: y + h * frac, w, h: h * (1 - frac) };
  doSplit(left, lr, results, !horizontal);
  doSplit(right, rr, results, !horizontal);
}

const pct = (v: number, base: number) => `${(v / base * 100).toFixed(3)}%`;
const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + "…" : s;

export function GameNetwork({ network }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const m = new Map<number, { name: string; genres: string[] }>();
    for (const n of network.nodes) m.set(n.appid, { name: n.name, genres: n.genres });
    return m;
  }, [network.nodes]);

  // Group nodes by their first genre
  const genreGroups = useMemo(() => {
    const m = new Map<string, { appid: number; name: string }[]>();
    for (const n of network.nodes) {
      const g = firstGenre(n.genres);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push({ appid: n.appid, name: n.name });
    }
    return m;
  }, [network.nodes]);

  // Count inter-genre connections
  const genreLinks = useMemo(() => {
    const links: { source: string; target: string; strength: number }[] = [];
    const pairMap = new Map<string, number>();

    for (const l of network.links) {
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
      links.push({ source, target, strength });
    }
    return links;
  }, [network.links, nodeMap]);

  // Genre-level treemap layout (sized by number of games)
  const W = 400, H = 300;
  const genreNames = useMemo(() => [...genreGroups.keys()], [genreGroups]);

  const genreLayout = useMemo(() => {
    const items = genreNames.map(g => ({
      name: g, value: genreGroups.get(g)!.length, color: genreColor(g),
    }));
    return treemapLayout(items, { x: 0, y: 0, w: W, h: H });
  }, [genreNames, genreGroups]);

  // Build genre block data
  const genreBlocks = useMemo(() => {
    return genreNames.map((name, i) => ({
      name,
      color: genreColor(name),
      games: genreGroups.get(name) || [],
      connections: genreLinks
        .filter(l => l.source === name || l.target === name)
        .reduce((s, l) => s + l.strength, 0),
      layout: genreLayout[i],
    }));
  }, [genreNames, genreGroups, genreLinks, genreLayout]);

  // Game-level layout for drill-down
  const drillLayout = useMemo(() => {
    if (!selectedGenre) return { blocks: [] as LayoutItem[], links: [] as { source: number; target: number; strength: number }[] };
    const games = genreGroups.get(selectedGenre) || [];
    const items = games.map(g => ({ name: g.name, value: 1, color: genreColor(selectedGenre) }));
    const blocks = treemapLayout(items, { x: 0, y: 0, w: W, h: H });

    // Intra-genre links + inter-genre links
    const gameAppids = new Set(games.map(g => g.appid));
    const links = network.links.filter(l => {
      const sIn = gameAppids.has(l.source);
      const tIn = gameAppids.has(l.target);
      return sIn || tIn;
    });

    return { blocks, links };
  }, [selectedGenre, genreGroups, network.links]);

  const handleGenreClick = useCallback((genre: string) => {
    setSelectedGenre(g => g === genre ? null : genre);
  }, []);

  if (!network.nodes.length) return <div className="viz-card"><h3>Game Network</h3><p className="viz-subtitle">Need more data — check back after a few days</p></div>;

  // Center points for genre blocks (for connection lines)
  const blockCenters = useMemo(() => {
    const m = new Map<string, { cx: number; cy: number }>();
    for (const b of genreBlocks) {
      if (b.layout) {
        m.set(b.name, {
          cx: b.layout.x + b.layout.w / 2,
          cy: b.layout.y + b.layout.h / 2,
        });
      }
    }
    return m;
  }, [genreBlocks]);

  // For drill-down: compute game centers
  const drillGameCenters = useMemo(() => {
    const m = new Map<number, { cx: number; cy: number }>();
    if (!selectedGenre) return m;
    const games = genreGroups.get(selectedGenre) || [];
    drillLayout.blocks.forEach((bl, i) => {
      if (games[i]) {
        m.set(games[i].appid, { cx: bl.x + bl.w / 2, cy: bl.y + bl.h / 2 });
      }
    });
    return m;
  }, [selectedGenre, genreGroups, drillLayout]);

  return (
    <div className="viz-card">
      <h3>Game Network</h3>
      <p className="viz-subtitle">
        {selectedGenre ? (
          <>
            <button className="treemap-back" onClick={() => setSelectedGenre(null)}>← Back</button>
            {" "}{selectedGenre} — connections to games in other genres
          </>
        ) : (
          "Connected = played in the same period"
        )}
      </p>

      <div className="network-treemap" style={{ position: "relative", width: "100%", paddingBottom: "75%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} className="network-svg">
          {selectedGenre ? (
            <>
              {/* Inter + intra genre links */}
              {drillLayout.links.map((l, i) => {
                const sc = drillGameCenters.get(l.source);
                const tc = drillGameCenters.get(l.target);
                if (!sc && !tc) return null;
                const s = sc || tc!;
                const t = tc || sc!;
                // If one end is outside, draw to edge
                const sn = nodeMap.get(l.source);
                const sg = sn ? firstGenre(sn.genres) : "";
                const isSourceIn = sn && firstGenre(sn.genres) === selectedGenre;
                const isTargetIn = nodeMap.get(l.target) && firstGenre(nodeMap.get(l.target)!.genres) === selectedGenre;
                // Only draw lines where at least one end is in the selected genre
                if (!isSourceIn && !isTargetIn) return null;
                return (
                  <line key={i}
                    x1={isSourceIn ? s.cx : (isTargetIn ? t.cx : s.cx)}
                    y1={isSourceIn ? s.cy : (isTargetIn ? t.cy : s.cy)}
                    x2={isTargetIn ? t.cx : (isSourceIn ? s.cx : t.cx)}
                    y2={isTargetIn ? t.cy : (isSourceIn ? s.cy : t.cy)}
                    stroke="#39d353" strokeWidth={Math.min(l.strength * 1.5, 4)}
                    opacity={0.35}
                  />
                );
              })}
              {/* Game blocks */}
              {drillLayout.blocks.map((bl, i) => {
                const games = genreGroups.get(selectedGenre!) || [];
                const game = games[i];
                if (!game) return null;
                const isInGenre = nodeMap.get(game.appid) && firstGenre(nodeMap.get(game.appid)!.genres) === selectedGenre;
                return (
                  <g key={game.appid}>
                    <rect
                      x={bl.x + 1} y={bl.y + 1}
                      width={Math.max(0, bl.w - 2)} height={Math.max(0, bl.h - 2)}
                      rx={3}
                      fill={bl.color}
                      fillOpacity={isInGenre ? 0.7 : 0.3}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.5}
                    />
                    {bl.w > 50 && bl.h > 16 && (
                      <text
                        x={bl.x + bl.w / 2} y={bl.y + bl.h / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize={8} fontWeight={600}
                        fontFamily="var(--font)"
                      >
                        {truncate(bl.name, bl.w > 120 ? 20 : 10)}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {/* Connection lines between genre blocks */}
              {genreLinks.map((l, i) => {
                const sc = blockCenters.get(l.source);
                const tc = blockCenters.get(l.target);
                if (!sc || !tc) return null;
                return (
                  <line key={i}
                    x1={sc.cx} y1={sc.cy}
                    x2={tc.cx} y2={tc.cy}
                    stroke="#39d353"
                    strokeWidth={Math.min(l.strength * 1.5, 5)}
                    opacity={0.3}
                    strokeDasharray="4 2"
                  />
                );
              })}
              {/* Genre blocks */}
              {genreBlocks.map((b) => {
                if (!b.layout) return null;
                const { x, y, w, h } = b.layout;
                return (
                  <g key={b.name} onClick={() => handleGenreClick(b.name)} style={{ cursor: "pointer" }}>
                    <rect
                      x={x + 1} y={y + 1}
                      width={Math.max(0, w - 2)} height={Math.max(0, h - 2)}
                      rx={3}
                      fill={b.color}
                      fillOpacity={0.2}
                      stroke={b.color}
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                    />
                    {w > 40 && h > 20 && (
                      <text
                        x={x + 6} y={y + 14}
                        fill={b.color} fontSize={9} fontWeight={700}
                        fontFamily="var(--font)"
                      >
                        {truncate(b.name, w > 100 ? 16 : 6)}
                      </text>
                    )}
                    {w > 50 && h > 30 && (
                      <text
                        x={x + 6} y={y + 25}
                        fill={b.color} fontSize={7} opacity={0.6}
                        fontFamily="var(--font)"
                      >
                        {b.games.length} games · {b.connections} links
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </svg>
      </div>

      {!selectedGenre && (
        <div className="treemap-legend" style={{ marginTop: 8 }}>
          {genreNames.slice(0, 8).map(g => (
            <span key={g} className="treemap-legend-item" onClick={() => handleGenreClick(g)}>
              <span className="treemap-legend-dot" style={{ background: genreColor(g) }} />
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
