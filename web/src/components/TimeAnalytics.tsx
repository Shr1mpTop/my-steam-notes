import type { TimeHeatmapItem, WeekdayItem } from "../types";

interface TimeHeatmapProps { data: TimeHeatmapItem[]; }
interface WeekdayProps { data: WeekdayItem[]; }
interface ClockProps { data: TimeHeatmapItem[]; }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TimeHeatmap({ data }: TimeHeatmapProps) {
  const grid: Record<string, number> = {};
  let maxCount = 1;
  for (const d of data) {
    const key = `${d.dow}-${d.hour}`;
    grid[key] = d.count;
    if (d.count > maxCount) maxCount = d.count;
  }

  return (
    <div className="viz-card">
      <h3>When You Play</h3>
      <p className="viz-subtitle">Hour of day × Day of week — brighter = more active</p>
      <div className="time-heatmap">
        <div className="th-labels-y">
          {DAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="th-grid">
          {DAYS.map((_, dow) => (
            <div key={dow} className="th-row">
              {HOURS.map((hour) => {
                const count = grid[`${dow}-${hour}`] || 0;
                const intensity = count / maxCount;
                return (
                  <div
                    key={hour}
                    className="th-cell"
                    style={{
                      background: count > 0
                        ? `rgba(57, 211, 83, ${0.2 + intensity * 0.8})`
                        : "#161b22",
                    }}
                    title={`${DAYS[dow]} ${hour}:00 — ${count} polls active`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="th-labels-x">
          {HOURS.filter((_, i) => i % 3 === 0).map((h) => <span key={h}>{h}h</span>)}
        </div>
      </div>
    </div>
  );
}

export function GamingClock({ data }: ClockProps) {
  const hourCounts: number[] = Array(24).fill(0);
  for (const d of data) hourCounts[d.hour] += d.count;
  const maxH = Math.max(...hourCounts, 1);

  const cx = 120, cy = 120, r = 90;
  const points = hourCounts.map((count, hour) => {
    const angle = ((hour - 6) / 24) * 2 * Math.PI - Math.PI / 2;
    const dist = r * 0.3 + (count / maxH) * r * 0.7;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, hour, count };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const hourLabels = Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    const angle = ((hour - 6) / 24) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (r + 14), y: cy + Math.sin(angle) * (r + 14), label: `${hour}h` };
  });

  return (
    <div className="viz-card">
      <h3>Gaming Clock</h3>
      <p className="viz-subtitle">24h activity pattern</p>
      <svg viewBox="0 0 240 240" width="240" height="240" className="gaming-clock">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth="1" />
        {hourLabels.map((l) => <text key={l.label} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="#8b949e" fontSize="9">{l.label}</text>)}
        <path d={pathD} fill="rgba(57, 211, 83, 0.3)" stroke="#39d353" strokeWidth="2" />
        {points.map((p) => p.count > 0 && <circle key={p.hour} cx={p.x} cy={p.y} r="3" fill="#39d353" />)}
      </svg>
    </div>
  );
}

export function WeekdayChart({ data }: WeekdayProps) {
  const maxMin = Math.max(...data.map((d) => d.minutes), 1);
  return (
    <div className="viz-card">
      <h3>Weekday Preference</h3>
      <p className="viz-subtitle">Total playtime by day of week</p>
      <div className="weekday-bars">
        {data.map((d) => (
          <div key={d.day} className="weekday-bar-col">
            <div className="weekday-bar-track">
              <div className="weekday-bar-fill" style={{ height: `${(d.minutes / maxMin) * 100}%` }} />
            </div>
            <span className="weekday-label">{d.day}</span>
            <span className="weekday-value">{d.minutes > 60 ? `${(d.minutes / 60).toFixed(0)}h` : `${d.minutes}m`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
