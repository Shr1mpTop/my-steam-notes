import { useMemo } from "react";
import { motion } from "framer-motion";
import type { DashboardData } from "../../types";
import { useLocale } from "../../useLocale";
import { fmtDuration } from "../../lib/format";
import { GlowCard } from "./GlowCard";

export function Rhythm({ data }: { data: DashboardData }) {
  const { t } = useLocale();

  const week = data.weekday || [];
  const maxWeek = Math.max(...week.map((w) => w.minutes), 1);
  const topIdx = week.reduce((best, w, i) => (w.minutes > (week[best]?.minutes ?? 0) ? i : best), 0);

  const hours = useMemo(() => {
    const buckets = new Array(24).fill(0);
    for (const item of data.time_heatmap || []) buckets[item.hour] += item.count || 0;
    return buckets;
  }, [data]);
  const maxHour = Math.max(...hours, 1);
  const peakHour = hours.indexOf(maxHour);

  return (
    <div className="grid-2" style={{ marginTop: 14 }}>
      <GlowCard>
        <div className="card-head">
          <span className="t">{t("weekdayPreference")}</span>
          <span className="s">{t("weekdaySubtitle")}</span>
        </div>
        <div className="week-grid">
          {week.map((w, i) => (
            <div key={w.day} className={`week-col${i === topIdx ? " is-top" : ""}`}>
              <span className="val">{fmtDuration(w.minutes)}</span>
              <div className="bar">
                <motion.div
                  className="fill"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${Math.max(4, (w.minutes / maxWeek) * 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
              <span className="lbl">{w.day}</span>
            </div>
          ))}
        </div>
      </GlowCard>

      <GlowCard delay={0.08}>
        <div className="card-head">
          <span className="t">{t("hourTitle")}</span>
          <span className="s">{t("timeHeatmapSubtitle")}</span>
        </div>
        <div className="hour-rows">
          {hours.map((n, h) => (
            <div className="hour-row" key={h}>
              <span className="h">{h % 3 === 0 ? `${String(h).padStart(2, "0")}:00` : ""}</span>
              <div className="track">
                <motion.div
                  className="fill"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(2, (n / maxHour) * 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: h * 0.015, ease: "easeOut" }}
                />
              </div>
              <span className="n">{h === peakHour ? "▲ peak" : n > 0 ? fmtDuration(n) : ""}</span>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
}
