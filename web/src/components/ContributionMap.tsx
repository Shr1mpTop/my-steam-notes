import { useState } from "react";
import type { HeatmapDay } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  heatmap: Record<string, HeatmapDay>;
  updatedAt: string;
}

const LEVELS = [
  { max: 0, color: "#17130d", label: "No activity" },
  { max: 30, color: "#fde047", label: "< 30m" },
  { max: 60, color: "#facc15", label: "30m–1h" },
  { max: 180, color: "#fb923c", label: "1–3h" },
  { max: 300, color: "#f97316", label: "3–5h" },
  { max: 480, color: "#ef4444", label: "5–8h" },
  { max: Infinity, color: "#7f1d1d", label: "> 8h" },
];

const ACTIVE_LEVELS = LEVELS.filter((level) => level.max > 0);

function getColor(minutes: number) {
  for (const l of LEVELS) {
    if (minutes <= l.max) return l.color;
  }
  return LEVELS[LEVELS.length - 1].color;
}

function formatDate(dateStr: string) {
  const d = dateFromKey(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function dateFromKey(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayIndex(dateStr: string) {
  return (dateFromKey(dateStr).getDay() + 6) % 7;
}

export function ContributionMap({ heatmap, updatedAt }: Props) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);

  const anchorKey = updatedAt.slice(0, 10) || dateKey(new Date());
  const anchorDate = dateFromKey(anchorKey);
  const days: { date: string; minutes: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = heatmap[key];
    days.push({ date: key, minutes: entry?.online_minutes ?? 0 });
  }

  // Arrange into weeks (columns), Mon-Sun (rows)
  const weeks: typeof days[] = [];
  let week: typeof days = [];
  for (const day of days) {
    const dow = mondayIndex(day.date);
    // Pad first week
    if (weeks.length === 0 && week.length === 0 && dow !== 0) {
      for (let p = 0; p < dow; p++) week.push({ date: "", minutes: -1 });
    }
    week.push(day);
    if (dow === 6) {
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
      <h2>{t("activityHeatmap")}</h2>
      <p className="subtitle">
        {totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(0)}h ${t("lastYear")} · ${activeDays} ${t("activeDays")}` : `${t("noActivity")} - ${t("waitingPolls")}`}
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
        <span>{t("less")}</span>
        {ACTIVE_LEVELS.map((l, i) => (
          <div key={i} className="heatmap-cell" style={{ background: l.color }} title={l.label} />
        ))}
        <span>{t("more")}</span>
      </div>

      {selected && sel && (
        <div className="day-detail">
          <h3>{formatDate(selected)}</h3>
          <p>{t("total")}: {(sel.online_minutes / 60).toFixed(1)}h {t("playtime")}</p>
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
