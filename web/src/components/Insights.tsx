import type { StatsData, GameNetworkData, GameCloudItem } from "../types";

interface StatsProps { stats: StatsData; }
interface NetworkProps { network: GameNetworkData; }
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

export function GameNetwork({ network }: NetworkProps) {
  if (!network.nodes.length) return <div className="viz-card"><h3>Game Network</h3><p className="viz-subtitle">Need more data — check back after a few days</p></div>;

  const cx = 200, cy = 150;
  const nodeMap: Record<string, { x: number; y: number }> = {};
  network.nodes.forEach((name, i) => {
    const angle = (i / network.nodes.length) * 2 * Math.PI;
    nodeMap[name] = { x: cx + Math.cos(angle) * 110, y: cy + Math.sin(angle) * 100 };
  });

  return (
    <div className="viz-card">
      <h3>Game Network</h3>
      <p className="viz-subtitle">Connected = played in the same period</p>
      <svg viewBox="0 0 400 300" width="100%" className="network-svg">
        {network.links.map((l, i) => (
          <line key={i} x1={nodeMap[l.source]?.x} y1={nodeMap[l.source]?.y} x2={nodeMap[l.target]?.x} y2={nodeMap[l.target]?.y} stroke="#39d353" strokeWidth={Math.min(l.strength * 2, 6)} opacity={0.4} />
        ))}
        {network.nodes.map((name) => (
          <g key={name}>
            <circle cx={nodeMap[name].x} cy={nodeMap[name].y} r="18" fill="#6366f1" opacity={0.8} />
            <text x={nodeMap[name].x} y={nodeMap[name].y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="7" fontWeight="600">
              {name.length > 10 ? name.slice(0, 9) + "…" : name}
            </text>
          </g>
        ))}
      </svg>
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
    return { name: g.name.length > 15 ? g.name.slice(0, 14) + "…" : g.name, hours: g.playtime_hours, recency: daysSince };
  }).sort((a, b) => b.hours - a.hours);

  return (
    <div className="viz-card">
      <h3>Staying Power</h3>
      <p className="viz-subtitle">Total hours vs days since last played</p>
      <div className="staying-grid">
        {data.map((g) => {
          const recencyColor = g.recency < 7 ? "#39d353" : g.recency < 30 ? "#f59e0b" : g.recency < 90 ? "#f97316" : "#ef4444";
          return (
            <div key={g.name} className="staying-row">
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
