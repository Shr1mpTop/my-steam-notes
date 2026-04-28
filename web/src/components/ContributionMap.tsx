import { useState } from "react";
import type { HeatmapDay } from "../types";

interface Props {
  heatmap: Record<string, HeatmapDay>;
}

const LEVELS = [
  { max: 0, color: "#151b26", label: "No activity" },
  { max: 60, color: "#164e63", label: "< 1h" },
  { max: 180, color: "#0e7490", label: "1–3h" },
  { max: 300, color: "#22d3ee", label: "3–5h" },
  { max: Infinity, color: "#a78bfa", label: "> 5h" },
];

function getColor(minutes: number) {
  for (const l of LEVELS) {
    if (minutes <= l.max) return l.color;
  }
  return LEVELS[LEVELS.length - 1].color;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function ContributionMap({ heatmap }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const today = new Date();
  const days: { date: string; minutes: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = heatmap[key];
    days.push({ date: key, minutes: entry?.online_minutes ?? 0 });
  }

  // Arrange into weeks (columns), Mon-Sun (rows)
  const weeks: typeof days[] = [];
  let week: typeof days = [];
  for (const day of days) {
    const dow = new Date(day.date + "T00:00:00Z").getUTCDay();
    // Pad first week
    if (weeks.length === 0 && week.length === 0 && dow !== 1) {
      for (let p = 1; p < dow; p++) week.push({ date: "", minutes: -1 });
    }
    week.push(day);
    if (dow === 0) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);

  const sel = selected ? heatmap[selected] : null;
  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
  const activeDays = days.filter((d) => d.minutes > 0).length;

  return (
    <div className="contribution-map">
      <h2>Activity Heatmap</h2>
      <p className="subtitle">
        {totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(0)}h in the last year across ${activeDays} days` : "No activity data yet — waiting for polls"}
      </p>

      <div className="heatmap-grid">
        {weeks.map((w, wi) => (
          <div key={wi} className="heatmap-col">
            {w.map((d, di) =>
              d.minutes === -1 ? (
                <div key={di} className="heatmap-cell empty" />
              ) : (
                <div
                  key={di}
                  className="heatmap-cell"
                  style={{ background: getColor(d.minutes) }}
                  title={`${formatDate(d.date)}: ${d.minutes > 0 ? (d.minutes / 60).toFixed(1) + "h" : "no activity"}`}
                  onClick={() => setSelected(d.date === selected ? null : d.date)}
                />
              )
            )}
          </div>
        ))}
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        {LEVELS.map((l, i) => (
          <div key={i} className="heatmap-cell" style={{ background: l.color }} title={l.label} />
        ))}
        <span>More</span>
      </div>

      {selected && sel && (
        <div className="day-detail">
          <h3>{formatDate(selected)}</h3>
          <p>Total: {(sel.online_minutes / 60).toFixed(1)}h online</p>
          {Object.entries(sel.games).length > 0 && (
            <ul>
              {Object.entries(sel.games)
                .sort(([, a], [, b]) => b - a)
                .map(([name, mins]) => (
                  <li key={name}>
                    {name}: {(mins / 60).toFixed(1)}h
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
