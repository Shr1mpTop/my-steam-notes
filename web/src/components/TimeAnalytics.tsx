import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { HeatmapDay, TimeHeatmapItem, WeekdayItem } from "../types";
import { useLocale } from "../useLocale";

interface TimeHeatmapProps { data: TimeHeatmapItem[]; }
interface WeekdayProps { data: WeekdayItem[]; heatmap?: Record<string, HeatmapDay>; }
interface ClockProps { data: TimeHeatmapItem[]; }
interface HeatmapTooltip {
  x: number;
  y: number;
  label: string;
  item: TimeHeatmapItem;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function weekdayIndex(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nativeDay = new Date(year, month - 1, day).getDay();
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

function formatHours(minutes: number) {
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${Math.round(minutes)}m`;
}

export function TimeHeatmap({ data }: TimeHeatmapProps) {
  const { t } = useLocale();
  const [tooltip, setTooltip] = useState<HeatmapTooltip | null>(null);
  const { grid, maxCount } = useMemo(() => {
    const nextGrid: Record<string, TimeHeatmapItem> = {};
    let nextMaxCount = 1;
    for (const d of data) {
      const key = `${d.dow}-${d.hour}`;
      nextGrid[key] = d;
      if (d.count > nextMaxCount) nextMaxCount = d.count;
    }
    return { grid: nextGrid, maxCount: nextMaxCount };
  }, [data]);

  const placeTooltip = (event: MouseEvent<HTMLElement>, dow: number, hour: number, item?: TimeHeatmapItem) => {
    const width = 280;
    const height = 230;
    const offset = 16;
    const nextItem = item ?? { dow, hour, count: 0, recent_count: 0, game_minutes: 0, online_minutes: 0, games: {} };
    const x = Math.max(12, Math.min(event.clientX + offset, window.innerWidth - width - 12));
    const y = Math.max(12, Math.min(event.clientY + offset, window.innerHeight - height - 12));
    setTooltip({ x, y, item: nextItem, label: `${DAYS[dow]} ${hour}:00` });
  };
  const tooltipGames = tooltip
    ? Object.entries(tooltip.item.games ?? {})
      .filter(([, minutes]) => minutes > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    : [];

  return (
    <div className="viz-card">
      <h3>{t("whenYouPlay")}</h3>
      <p className="viz-subtitle">{t("timeHeatmapSubtitle")}</p>
      <div className="time-heatmap" onMouseLeave={() => setTooltip(null)}>
        <div className="th-labels-y">
          {DAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="th-grid">
          {DAYS.map((_, dow) => (
            <div key={dow} className="th-row">
              {HOURS.map((hour) => {
                const item = grid[`${dow}-${hour}`];
                const count = item?.count ?? 0;
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
                    aria-label={`${DAYS[dow]} ${hour}:00 — ${formatHours(count)} ${t("weightedActivity")} · ${formatHours(item?.game_minutes ?? 0)} ${t("inGame")} · ${formatHours(item?.online_minutes ?? 0)} ${t("steamOnline")}`}
                    onMouseEnter={(event) => placeTooltip(event, dow, hour, item)}
                    onMouseMove={(event) => placeTooltip(event, dow, hour, item)}
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
      {tooltip && typeof document !== "undefined" && createPortal((
        <div className="time-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
          <div className="time-tooltip-title">{tooltip.label}</div>
          <div className="time-tooltip-row">
            <span>{t("weightedActivity")}</span>
            <strong>{formatHours(tooltip.item.count)}</strong>
          </div>
          <div className="time-tooltip-row">
            <span>{t("inGame")}</span>
            <strong>{formatHours(tooltip.item.game_minutes ?? 0)}</strong>
          </div>
          <div className="time-tooltip-row">
            <span>{t("steamOnline")}</span>
            <strong>{formatHours(tooltip.item.online_minutes ?? 0)}</strong>
          </div>
          <div className="time-tooltip-section">{t("gameBreakdown")}</div>
          <div className="time-tooltip-games">
            {tooltipGames.length > 0
              ? tooltipGames.map(([name, minutes]) => (
                <div key={name} className="time-tooltip-game">
                  <span>{name}</span>
                  <strong>{formatHours(minutes)}</strong>
                </div>
              ))
              : <span className="time-tooltip-empty">{t("noGameDetail")}</span>}
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

export function GamingClock({ data }: ClockProps) {
  const { t } = useLocale();
  const cx = 120, cy = 120, r = 90;
  const historicalCounts = useMemo(() => {
    const counts: number[] = Array(24).fill(0);
    for (const d of data) counts[d.hour] += d.count;
    return counts;
  }, [data]);
  const recentCounts = useMemo(() => {
    const counts: number[] = Array(24).fill(0);
    for (const d of data) counts[d.hour] += d.recent_count ?? 0;
    return counts;
  }, [data]);
  const historicalMax = Math.max(...historicalCounts, 1);
  const recentMax = Math.max(...recentCounts, 1);
  const hasRecent = recentCounts.some((count) => count > 0);

  const clockPoints = (counts: number[], maxValue: number) => counts.map((count, hour) => {
    const angle = ((hour - 6) / 24) * 2 * Math.PI - Math.PI / 2;
    const dist = r * 0.3 + (count / maxValue) * r * 0.7;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, hour, count };
  });
  const historicalPoints = clockPoints(historicalCounts, historicalMax);
  const recentPoints = clockPoints(recentCounts, recentMax);
  const pathD = (points: typeof historicalPoints) => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const hourLabels = Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    const angle = ((hour - 6) / 24) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (r + 14), y: cy + Math.sin(angle) * (r + 14), label: `${hour}h` };
  });

  return (
    <div className="viz-card">
      <h3>{t("gamingClock")}</h3>
      <p className="viz-subtitle">{t("gamingClockSubtitle")}</p>
      <div className="gaming-clock-wrap">
        <svg viewBox="0 0 240 240" width="240" height="240" className="gaming-clock">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#273244" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke="rgba(148, 163, 184, 0.14)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r * 0.3} fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          {hourLabels.map((l) => <text key={l.label} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="#96a1b5" fontSize="9">{l.label}</text>)}
          <path d={pathD(historicalPoints)} className="clock-area clock-area--average" />
          <path d={pathD(historicalPoints)} className="clock-line clock-line--average" />
          {hasRecent && <path d={pathD(recentPoints)} className="clock-area clock-area--recent" />}
          {hasRecent && <path d={pathD(recentPoints)} className="clock-line clock-line--recent" />}
          {historicalPoints.map((p) => p.count > 0 && <circle key={`avg-${p.hour}`} cx={p.x} cy={p.y} r="2.5" className="clock-dot clock-dot--average" />)}
          {hasRecent && recentPoints.map((p) => p.count > 0 && <circle key={`recent-${p.hour}`} cx={p.x} cy={p.y} r="3" className="clock-dot clock-dot--recent" />)}
        </svg>
        <div className="gaming-clock-legend">
          <span className="clock-legend-item">
            <span className="clock-legend-line clock-legend-line--average" />
            {t("historicalAverage")}
          </span>
          <span className="clock-legend-item">
            <span className="clock-legend-line clock-legend-line--recent" />
            {t("last24Hours")}
          </span>
        </div>
      </div>
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
