import { useMemo } from "react";
import type { HeatmapDay, TimeHeatmapItem, WeekdayItem } from "../types";
import { useLocale } from "../useLocale";

interface TimeHeatmapProps { data: TimeHeatmapItem[]; }
interface WeekdayProps { data: WeekdayItem[]; heatmap?: Record<string, HeatmapDay>; }
interface ClockProps { data: TimeHeatmapItem[]; }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function weekdayIndex(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nativeDay = new Date(year, month - 1, day).getDay();
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

export function TimeHeatmap({ data }: TimeHeatmapProps) {
  const { t } = useLocale();
  const grid: Record<string, number> = {};
  let maxCount = 1;
  for (const d of data) {
    const key = `${d.dow}-${d.hour}`;
    grid[key] = d.count;
    if (d.count > maxCount) maxCount = d.count;
  }

  return (
    <div className="viz-card">
      <h3>{t("whenYouPlay")}</h3>
      <p className="viz-subtitle">{t("timeHeatmapSubtitle")}</p>
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
                        ? `rgba(103, 232, 249, ${0.18 + intensity * 0.72})`
                        : "#151b26",
                    }}
                    title={`${DAYS[dow]} ${hour}:00 — ${count} polls active`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="th-labels-x">
          {HOURS.map((h) => <span key={h}>{h % 3 === 0 ? `${h}h` : ""}</span>)}
        </div>
      </div>
    </div>
  );
}

export function GamingClock({ data }: ClockProps) {
  const { t } = useLocale();
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
      <h3>{t("gamingClock")}</h3>
      <p className="viz-subtitle">{t("gamingClockSubtitle")}</p>
      <svg viewBox="0 0 240 240" width="240" height="240" className="gaming-clock">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#273244" strokeWidth="1" />
        {hourLabels.map((l) => <text key={l.label} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="#96a1b5" fontSize="9">{l.label}</text>)}
        <path d={pathD} fill="rgba(103, 232, 249, 0.22)" stroke="#67e8f9" strokeWidth="2" />
        {points.map((p) => p.count > 0 && <circle key={p.hour} cx={p.x} cy={p.y} r="3" fill="#a78bfa" />)}
      </svg>
    </div>
  );
}

export function WeekdayChart({ data, heatmap }: WeekdayProps) {
  const { t } = useLocale();
  const chartData = useMemo(() => {
    if (!heatmap || Object.keys(heatmap).length === 0) return data;

    const minutes = [0, 0, 0, 0, 0, 0, 0];
    for (const [date, entry] of Object.entries(heatmap)) {
      minutes[weekdayIndex(date)] += entry.online_minutes;
    }

    return DAYS.map((day, i) => ({ day, minutes: minutes[i] }));
  }, [data, heatmap]);

  const maxMin = Math.max(...chartData.map((d) => d.minutes), 1);
  return (
    <div className="viz-card">
      <h3>{t("weekdayPreference")}</h3>
      <p className="viz-subtitle">{t("weekdaySubtitle")}</p>
      <div className="weekday-bars">
        {chartData.map((d) => (
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
