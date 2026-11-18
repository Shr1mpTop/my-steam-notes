import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardData } from "../../types";
import { useLocale } from "../../useLocale";
import { GlowCard } from "./GlowCard";

const W = 1000;
const H = 300;
const PAD_L = 12;
const PAD_R = 12;
const PAD_T = 18;
const PAD_B = 26;

/** Catmull-Rom → cubic bezier smoothing for organic river curves. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function PlaytimeFlow({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const [range, setRange] = useState(90);
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo(() => {
    return Object.entries(data.heatmap)
      .map(([d, v]) => ({
        d,
        h: (v.playtime_minutes ?? v.online_minutes ?? 0) / 60,
        games: v.games ?? {},
      }))
      .sort((a, b) => (a.d < b.d ? -1 : 1));
  }, [data]);

  const slice = days.slice(-range);
  const max = Math.max(...slice.map((r) => r.h), 1);
  const step = (W - PAD_L - PAD_R) / Math.max(1, slice.length - 1);
  const pts = slice.map((r, i) => ({
    x: PAD_L + i * step,
    y: PAD_T + (1 - r.h / max) * (H - PAD_T - PAD_B),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]?.x ?? PAD_L} ${H - PAD_B} L ${PAD_L} ${H - PAD_B} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round((x - PAD_L) / step);
    setHover(Math.max(0, Math.min(slice.length - 1, i)));
  };

  const hv = hover != null ? slice[hover] : null;
  const topGame = hv
    ? Object.entries(hv.games).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const tipLeft = hover != null ? `${((PAD_L + hover * step) / W) * 100}%` : "50%";
  const tipTop = hover != null ? `${((pts[hover]?.y ?? 0) / H) * 100}%` : "50%";

  return (
    <GlowCard>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <span className="t">{t("flowTitle")}</span>
          <span className="s">{t("flowSub")}</span>
        </div>
        <div className="flow-controls">
          {[30, 90, 365].map((r) => (
            <button key={r} className={range === r ? "is-active" : ""} onClick={() => setRange(r)}>
              {t(r === 30 ? "range30" : r === 90 ? "range90" : "range365")}
            </button>
          ))}
        </div>
      </div>

      <div className="flow-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="flowStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="52%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(129, 140, 248, 0.34)" />
              <stop offset="100%" stopColor="rgba(129, 140, 248, 0.02)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + g * (H - PAD_T - PAD_B)}
              y2={PAD_T + g * (H - PAD_T - PAD_B)}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 6"
            />
          ))}
          <path d={area} fill="url(#flowFill)" />
          <motion.path
            d={line}
            fill="none"
            stroke="url(#flowStroke)"
            strokeWidth={2.4}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
          {hover != null && pts[hover] && (
            <g>
              <line
                x1={pts[hover].x}
                x2={pts[hover].x}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="rgba(165, 180, 252, 0.4)"
                strokeDasharray="3 4"
              />
              <circle cx={pts[hover].x} cy={pts[hover].y} r={4.5} fill="#a5b4fc" />
              <circle cx={pts[hover].x} cy={pts[hover].y} r={9} fill="rgba(165, 180, 252, 0.2)" />
            </g>
          )}
        </svg>

        {hv && (
          <div className="flow-tip" style={{ left: tipLeft, top: tipTop }}>
            <div className="d">{hv.d}</div>
            <div className="h">{hv.h.toFixed(1)}h</div>
            {topGame && <div className="g">{topGame}</div>}
          </div>
        )}
      </div>
    </GlowCard>
  );
}
