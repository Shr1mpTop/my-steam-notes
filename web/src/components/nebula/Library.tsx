import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardData } from "../../types";
import { useLocale } from "../../useLocale";
import { fmtHours } from "../../lib/format";
import { GlowCard } from "./GlowCard";

const SIZE = 220;
const R = 84;
const C = 2 * Math.PI * R;

export function GenreRings({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const [active, setActive] = useState<number | null>(null);

  const { segs, totalHours, totalGames } = useMemo(() => {
    const all = [...(data.genres || [])].sort((a, b) => b.hours - a.hours);
    const top = all.slice(0, 8);
    const rest = all.slice(8);
    const list = rest.length
      ? [...top, { genre: "Other", games: rest.reduce((a, g) => a + g.games, 0), hours: rest.reduce((a, g) => a + g.hours, 0) }]
      : top;
    const total = list.reduce((a, g) => a + g.hours, 0) || 1;
    let acc = 0;
    const segs = list.map((g) => {
      const frac = g.hours / total;
      const seg = { ...g, frac, offset: acc };
      acc += frac;
      return seg;
    });
    return { segs, totalHours: total, totalGames: list.reduce((a, g) => a + g.games, 0) };
  }, [data]);

  return (
    <GlowCard>
      <div className="card-head">
        <span className="t">{t("genreDistribution")}</span>
        <span className="s">{t("genreSubtitle")}</span>
      </div>
      <div className="donut-wrap">
        <div className="donut">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.05)" />
            {segs.map((s, i) => (
              <motion.circle
                key={s.genre}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={["#818cf8", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#f472b6", "#94a3b8", "#64748b"][i % 9]}
                strokeDasharray={`${Math.max(0.5, s.frac * C - 3)} ${C}`}
                transform={`rotate(${-90 + s.offset * 360} ${SIZE / 2} ${SIZE / 2})`}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: active == null || active === i ? 1 : 0.28 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </svg>
          <div className="center">
            <div className="b">{fmtHours(totalHours)}</div>
            <div className="k">{totalGames} {t("games")}</div>
          </div>
        </div>
        <div className="donut-legend">
          {segs.map((s, i) => (
            <span
              key={s.genre}
              className="legend-chip"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="dot" style={{ background: ["#818cf8", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#f472b6", "#94a3b8", "#64748b"][i % 9] }} />
              {s.genre} · {Math.round(s.hours)}h
            </span>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}

export function PlatformBars({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const entries = Object.entries(data.platform || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const colors: Record<string, string> = {
    windows: "linear-gradient(90deg,#818cf8,#6366f1)",
    mac: "linear-gradient(90deg,#22d3ee,#0891b2)",
    linux: "linear-gradient(90deg,#34d399,#059669)",
    deck: "linear-gradient(90deg,#fbbf24,#f59e0b)",
  };

  return (
    <GlowCard delay={0.06}>
      <div className="card-head">
        <span className="t">{t("platformBreakdown")}</span>
        <span className="s">{t("hoursByPlatform")}</span>
      </div>
      <div className="plat-rows">
        {entries.map(([name, hours]) => {
          const pct = Math.round((hours / total) * 100);
          const key = name.toLowerCase();
          return (
            <div className="plat-row" key={name}>
              <span className="n">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
              <div className="track">
                <motion.div
                  className="fill"
                  style={{ background: colors[key] ?? "linear-gradient(90deg,#a78bfa,#6366f1)" }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(3, pct)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="v">{pct}% · {Math.round(hours)}h</span>
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}

export function ParetoCurve({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const W = 1000;
  const H = 300;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 34;
  const pts = (data.pareto || []).map((p, i) => ({
    x: PAD_L + (i / Math.max(1, (data.pareto?.length ?? 1) - 1)) * (W - PAD_L - PAD_R),
    y: PAD_T + (1 - p.cumulative_pct / 100) * (H - PAD_T - PAD_B),
    p,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1]?.x ?? PAD_L} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`;

  return (
    <GlowCard delay={0.1}>
      <div className="card-head">
        <span className="t">{t("rule8020")}</span>
        <span className="s">{t("rule8020Subtitle")}</span>
      </div>
      <div className="pareto-wrap">
        <svg viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="paretoFill2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(129, 140, 248, 0.3)" />
              <stop offset="100%" stopColor="rgba(129, 140, 248, 0.02)" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + (1 - g / 100) * (H - PAD_T - PAD_B)}
                y2={PAD_T + (1 - g / 100) * (H - PAD_T - PAD_B)}
                stroke={g === 80 ? "rgba(251, 191, 36, 0.4)" : "rgba(255,255,255,0.05)"}
                strokeDasharray={g === 80 ? "6 5" : "3 6"}
              />
              <text x={6} y={PAD_T + (1 - g / 100) * (H - PAD_T - PAD_B) + 4} fill="rgba(255,255,255,0.3)" fontSize={11} fontFamily="var(--mono)">
                {g}%
              </text>
            </g>
          ))}
          <path d={area} fill="url(#paretoFill2)" />
          <motion.path
            d={line}
            fill="none"
            stroke="#a5b4fc"
            strokeWidth={2.2}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <text x={PAD_L} y={H - 10} fill="rgba(255,255,255,0.35)" fontSize={11} fontFamily="var(--mono)">
            #1
          </text>
          <text x={W - PAD_R} y={H - 10} fill="rgba(255,255,255,0.35)" fontSize={11} fontFamily="var(--mono)" textAnchor="end">
            #{pts.length} · {t("gameRank")}
          </text>
        </svg>
      </div>
    </GlowCard>
  );
}
