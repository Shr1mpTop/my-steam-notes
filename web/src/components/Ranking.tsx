import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";
import type { ParetoItem } from "../types";

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
  const top20 = data.slice(0, 20);
  return (
    <div className="viz-card">
      <h3>80/20 Rule</h3>
      <p className="viz-subtitle">Top games account for most of your playtime</p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={top20} margin={{ left: 10, right: 20, top: 10, bottom: 40 }}>
          <XAxis dataKey="rank" tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={{ stroke: GRID }} label={{ value: "Game Rank", position: "bottom", fill: AXIS, fontSize: 10 }} />
          <YAxis tick={{ fill: AXIS, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={{ stroke: GRID }} domain={[0, 100]} unit="%" />
          <Tooltip
            formatter={(v, name) => name === "cumulative_pct" ? [`${v}%`, "Cumulative"] : [`${v}h`, "Hours"]}
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
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="viz-card">
      <h3>Platform Breakdown</h3>
      <p className="viz-subtitle">Hours by platform</p>
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
