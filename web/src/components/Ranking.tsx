import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";
import type { ParetoItem } from "../types";
import { useLocale } from "../useLocale";

interface ParetoProps { data: ParetoItem[]; }
interface PlatformProps { data: Record<string, number>; }

const COLORS = ["#67e8f9", "#a78bfa", "#34d399", "#f59e0b", "#fb7185", "#60a5fa", "#f472b6", "#22c55e", "#f97316", "#818cf8"];
const AXIS = "#667085";
const GRID = "#273244";
const TOOLTIP = {
  background: "rgba(9, 11, 16, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 8,
  color: "#e8edf7",
};

export function ParetoChart({ data }: ParetoProps) {
  const { t } = useLocale();
  const top20 = data.slice(0, 20);
  return (
    <div className="viz-card">
      <h3>{t("rule8020")}</h3>
      <p className="viz-subtitle">{t("rule8020Subtitle")}</p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={top20} margin={{ left: 10, right: 20, top: 10, bottom: 40 }}>
          <XAxis dataKey="rank" tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={{ stroke: GRID }} label={{ value: t("gameRank"), position: "bottom", fill: AXIS, fontSize: 10 }} />
          <YAxis tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={{ stroke: GRID }} domain={[0, 100]} unit="%" />
          <Tooltip
            formatter={(v, name) => name === "cumulative_pct" ? [`${v}%`, t("cumulative")] : [`${v}h`, t("totalHours")]}
            contentStyle={TOOLTIP}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
          />
          <Area type="monotone" dataKey="cumulative_pct" stroke="#67e8f9" fill="rgba(103, 232, 249, 0.14)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformPie({ data }: PlatformProps) {
  const { t } = useLocale();
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="viz-card">
      <h3>{t("platformBreakdown")}</h3>
      <p className="viz-subtitle">{t("hoursByPlatform")}</p>
      <div className="platform-chart">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}h`]} contentStyle={TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        <div className="platform-legend">
          {chartData.map((d, i) => (
            <div key={d.name} className="legend-item">
              <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span>{d.name}: {d.value.toFixed(0)}h ({((d.value / total) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
