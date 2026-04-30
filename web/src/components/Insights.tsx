import { useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { StatsData, GameNetworkData, GameCloudItem } from "../types";
import { useLocale } from "../useLocale";

interface StatsProps { stats: StatsData; }
interface DustProps { played: number; never: number; }
interface StayingProps { games: GameCloudItem[]; }

export function StatsCards({ stats }: StatsProps) {
  const { t } = useLocale();
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-value">{stats.total_games}</span>
        <span className="stat-label">{t("totalGames")}</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.played_games}</span>
        <span className="stat-label">{t("played")}</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.dust_rate}%</span>
        <span className="stat-label">{t("dustRate")}</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.loyalty_score}</span>
        <span className="stat-label">{t("loyalty")}: {stats.loyalty_label}</span>
      </div>
      {stats.peak_day && (
        <div className="stat-card">
          <span className="stat-value">{(stats.peak_day.minutes / 60).toFixed(1)}h</span>
          <span className="stat-label">{t("peakDay")} ({stats.peak_day.date})</span>
        </div>
      )}
      <div className="stat-card">
        <span className="stat-value">{stats.longest_streak.days} {t("daysUnit")}</span>
        <span className="stat-label">{t("longestStreak")}</span>
      </div>
    </div>
  );
}

export function DustMeter({ played, never }: DustProps) {
  const { t } = useLocale();
  const total = played + never;
  const playedPct = total > 0 ? Math.round((played / total) * 100) : 0;
  const dustPct = 100 - playedPct;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dustLength = (dustPct / 100) * circumference;

  return (
    <div className="viz-card dust-card">
      <h3>{t("dustRate")}</h3>
      <p className="viz-subtitle">{t("libraryActivation")}</p>
      <div className="dust-radial">
        <svg viewBox="0 0 140 140" className="dust-ring" aria-label={`${t("dustRate")} ${dustPct}%`}>
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
          <span className="dust-caption">{t("neverOpened")}</span>
        </div>
      </div>
      <div className="dust-breakdown">
        <span><strong>{played}</strong> {t("played")}</span>
        <span><strong>{never}</strong> {t("never")}</span>
        <span><strong>{total}</strong> {t("total")}</span>
      </div>
    </div>
  );
}

export function StayingPower({ games }: StayingProps) {
  const { t } = useLocale();
  const [now] = useState(() => Date.now() / 1000);
  const withLast = games.filter((g) => g.rtime_last_played > 0);
  if (!withLast.length) return null;

  const data = withLast.slice(0, 15).map((g) => {
    const daysSince = Math.round((now - g.rtime_last_played) / 86400);
    return { appid: g.appid, name: g.name.length > 15 ? g.name.slice(0, 14) + "…" : g.name, hours: g.playtime_hours, recency: daysSince };
  }).sort((a, b) => b.hours - a.hours);

  return (
    <div className="viz-card">
      <h3>{t("stayingPower")}</h3>
      <p className="viz-subtitle">{t("stayingSubtitle")}</p>
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
              <span className="staying-recency" style={{ color: recencyColor }}>{g.recency === 0 ? t("today") : `${g.recency}${t("daysAgo")}`}</span>
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

interface ForceNode extends SimulationNodeDatum {
  id: number;
  appid: number;
  name: string;
  genres: string[];
  genre: string;
  degree: number;
  r: number;
}

interface ForceGraphLink extends SimulationLinkDatum<ForceNode> {
  source: string | number | ForceNode;
  target: string | number | ForceNode;
  strength: number;
}

interface PositionedLink {
  source: ForceNode;
  target: ForceNode;
  strength: number;
}

export function GameNetwork({ network }: Props) {
  const { t } = useLocale();
  const W = 640;
  const H = 380;

  const nodes = useMemo(() => {
    const m = new Map<number, { appid: number; name: string; genres: string[] }>();
    for (const n of (network.nodes as NetworkNodeInput[])) {
      const node = typeof n === "string"
        ? { appid: 0, name: n, genres: [] as string[] }
        : { appid: n.appid ?? 0, name: n.name ?? "", genres: n.genres ?? [] };
      if (node.appid > 0) m.set(node.appid, node);
    }
    return [...m.values()];
  }, [network.nodes]);

  const links = useMemo(() => {
    return (network.links as NetworkLinkInput[])
      .map((l) => ({
        source: typeof l.source === "string" ? 0 : (l.source ?? 0),
        target: typeof l.target === "string" ? 0 : (l.target ?? 0),
        strength: l.strength ?? 1,
      }))
      .filter((l) => l.source > 0 && l.target > 0 && l.source !== l.target);
  }, [network.links]);

  const nodeMap = useMemo(() => {
    const m = new Map<number, { appid: number; name: string; genres: string[] }>();
    for (const n of nodes) m.set(n.appid, n);
    return m;
  }, [nodes]);

  const gameDegree = useMemo(() => {
    const degree = new Map<number, number>();
    for (const l of links) {
      degree.set(l.source, (degree.get(l.source) || 0) + l.strength);
      degree.set(l.target, (degree.get(l.target) || 0) + l.strength);
    }
    return degree;
  }, [links]);

  const genreNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const genre = firstGenre(node.genres);
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
    return [...counts.keys()].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
  }, [nodes]);

  const communityCenters = useMemo(() => {
    const centers = new Map<string, { x: number; y: number }>();
    const radius = Math.min(W, H) * 0.26;
    genreNames.forEach((genre, i) => {
      const angle = genreNames.length === 1 ? 0 : (i / genreNames.length) * Math.PI * 2 - Math.PI / 2;
      centers.set(genre, {
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius * 0.82,
      });
    });
    return centers;
  }, [genreNames]);

  const graph = useMemo(() => {
    const maxDegree = Math.max(...nodes.map((n) => gameDegree.get(n.appid) || 0), 1);
    const simNodes: ForceNode[] = nodes.map((node, i) => {
      const genre = firstGenre(node.genres);
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      return {
        id: node.appid,
        appid: node.appid,
        name: node.name,
        genres: node.genres,
        genre,
        degree: gameDegree.get(node.appid) || 0,
        r: 10 + Math.sqrt((gameDegree.get(node.appid) || 1) / maxDegree) * 18,
        x: W / 2 + Math.cos(angle) * 120,
        y: H / 2 + Math.sin(angle) * 82,
      };
    });
    const simLinks: ForceGraphLink[] = links
      .filter((link) => nodeMap.has(link.source) && nodeMap.has(link.target))
      .map((link) => ({
        source: String(link.source),
        target: String(link.target),
        strength: link.strength,
      }));

    const simulation = forceSimulation<ForceNode>(simNodes)
      .force("link", forceLink<ForceNode, ForceGraphLink>(simLinks)
        .id((d) => String(d.id))
        .distance((l) => 118 - Math.min(l.strength, 10) * 6)
        .strength((l) => 0.08 + Math.min(l.strength, 10) * 0.025))
      .force("charge", forceManyBody<ForceNode>().strength((d) => -110 - d.r * 4))
      .force("collide", forceCollide<ForceNode>().radius((d) => d.r + 7).iterations(3))
      .force("x", forceX<ForceNode>((d) => communityCenters.get(d.genre)?.x ?? W / 2).strength(0.08))
      .force("y", forceY<ForceNode>((d) => communityCenters.get(d.genre)?.y ?? H / 2).strength(0.08))
      .force("center", forceCenter(W / 2, H / 2))
      .stop();

    for (let i = 0; i < 180; i++) simulation.tick();

    for (const node of simNodes) {
      node.x = Math.max(node.r + 12, Math.min(W - node.r - 12, node.x ?? W / 2));
      node.y = Math.max(node.r + 12, Math.min(H - node.r - 12, node.y ?? H / 2));
    }

    return {
      nodes: simNodes.sort((a, b) => a.r - b.r),
      links: simLinks.map((link) => ({
        source: link.source as ForceNode,
        target: link.target as ForceNode,
        strength: link.strength,
      })) satisfies PositionedLink[],
    };
  }, [nodes, links, nodeMap, gameDegree, communityCenters]);

  if (!network.nodes.length) return <div className="viz-card"><h3>{t("gameNetwork")}</h3><p className="viz-subtitle">{t("waitingPolls")}</p></div>;

  return (
    <div className="viz-card game-network-card">
      <h3>{t("gameNetwork")}</h3>
      <p className="viz-subtitle">{t("networkSubtitle")}</p>

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

          {graph.links.map((link, i) => (
            <line
              key={`${link.source.appid}-${link.target.appid}-${i}`}
              className="network-link"
              x1={link.source.x ?? W / 2}
              y1={link.source.y ?? H / 2}
              x2={link.target.x ?? W / 2}
              y2={link.target.y ?? H / 2}
              strokeWidth={Math.min(1 + link.strength * 0.45, 4)}
            />
          ))}
          {graph.nodes.map((node) => {
            const x = node.x ?? W / 2;
            const y = node.y ?? H / 2;
            return (
              <g key={node.appid} className="network-bubble">
                <circle cx={x} cy={y} r={node.r + 8} fill={genreColor(node.genre)} opacity="0.07" />
                <circle cx={x} cy={y} r={node.r} fill={genreColor(node.genre)} opacity="0.34" stroke={genreColor(node.genre)} strokeWidth="1.4" filter="url(#networkGlow)" />
                <text x={x} y={y - 3} textAnchor="middle" fill="#f8fbff" fontSize={node.r > 22 ? "10" : "9"} fontWeight="700">
                  {truncate(node.name, node.r > 24 ? 13 : 8)}
                </text>
                {node.degree > 0 && (
                  <text x={x} y={y + 12} textAnchor="middle" fill="#96a1b5" fontSize="9">
                    {node.degree} {t("links")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="treemap-legend network-legend">
        {genreNames.slice(0, 8).map((genre) => (
          <span key={genre} className="treemap-legend-item">
            <span className="treemap-legend-dot" style={{ background: genreColor(genre) }} />
            {genre}
          </span>
        ))}
      </div>
    </div>
  );
}
