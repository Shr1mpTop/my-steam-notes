import { useState } from "react";
import type { CSSProperties } from "react";
import type { HeatmapDay } from "../types";
import { useLocale } from "../useLocale";
import { HEAT_LEGEND, heatColor } from "../lib/palette";
import { fmtMinutes } from "../lib/format";
import { Panel } from "./ui";

interface Props {
  heatmap: Record<string, HeatmapDay>;
  updatedAt: string;
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

function playtimeMinutes(entry?: HeatmapDay) {
  return entry?.playtime_minutes ?? entry?.online_minutes ?? 0;
}

/**
 * 单元格原来是正方形:53 周 × 7 行在 span-8 面板里被压成 ~110px 的一条细带。
 * 换成略带纵向的比例,让面板真正占用垂直空间;比例而非固定高度,各断点自动缩放。
 */
const CELL_STYLE: CSSProperties = { aspectRatio: "1 / 1.45" };

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
    days.push({ date: key, minutes: playtimeMinutes(entry) });
  }

  // Arrange into weeks (columns), Mon-Sun (rows)
  const weeks: typeof days[] = [];
  let week: typeof days = [];
  for (const day of days) {
    const dow = mondayIndex(day.date);
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
    <Panel
      kicker={t("kickActivity")}
      title={t("activityHeatmap")}
      sub={
        totalMinutes > 0
          ? `${Math.round(totalMinutes / 60)}h ${t("lastYear")} · ${activeDays} ${t("activeDays")}`
          : `${t("noActivity")} — ${t("waitingPolls")}`
      }
      delay={0.06}
    >
      <div className="heatmap-grid">
        {weeks.map((w, wi) => (
          <div key={wi} className="heatmap-col">
            {w.map((d, di) =>
              d.minutes === -1 ? (
                <div key={di} className="heatmap-cell empty" style={CELL_STYLE} />
              ) : (
                <button
                  key={di}
                  className={`heatmap-cell${selected === d.date ? " is-selected" : ""}`}
                  type="button"
                  style={{ ...CELL_STYLE, background: heatColor(d.minutes) }}
                  title={`${formatDate(d.date)}: ${d.minutes > 0 ? fmtMinutes(d.minutes) : t("noActivity")}`}
                  aria-label={`${formatDate(d.date)}: ${d.minutes > 0 ? fmtMinutes(d.minutes) : t("noActivity")}`}
                  aria-pressed={selected === d.date}
                  onClick={() => setSelected(d.date === selected ? null : d.date)}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <div className="heatmap-foot">
        <div className="heatmap-legend">
          <span>{t("less")}</span>
          {HEAT_LEGEND.map((color, i) => (
            <div key={i} className="heatmap-cell" style={{ background: color }} />
          ))}
          <span>{t("more")}</span>
        </div>
      </div>

      {selected && sel && (
        <div className="day-detail">
          <h3>{formatDate(selected)}</h3>
          <p>
            {t("total")}: {fmtMinutes(playtimeMinutes(sel))} {t("playtime")}
          </p>
          {Object.entries(sel.games).length > 0 && (
            <ul>
              {Object.entries(sel.games)
                .sort(([, a], [, b]) => b - a)
                .map(([name, mins]) => (
                  <li key={name}>
                    <span style={{ whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}>{name}</span>
                    <span>{fmtMinutes(mins)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
