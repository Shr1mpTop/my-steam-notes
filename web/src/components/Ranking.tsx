import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { ParetoItem } from "../types";
import { useLocale } from "../useLocale";
import { dataColor } from "../lib/palette";
import { CHART_TOOLTIP_STYLE } from "../lib/ui-constants";
import { Panel } from "./ui";

interface ParetoProps { data: ParetoItem[]; }
interface PlatformProps { data: Record<string, number>; }

const AXIS = "var(--chart-axis)";
const GRID = "var(--chart-grid)";

export function ParetoChart({ data }: ParetoProps) {
  const { t } = useLocale();
  const top = data.slice(0, 40);

  return (
    <Panel kicker={t("kickRanking")} title={t("rule8020")} sub={t("rule8020Subtitle")} delay={0.12}>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={top} margin={{ left: 0, right: 12, top: 8, bottom: 26 }}>
          <defs>
            <linearGradient id="paretoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(122, 133, 240, 0.36)" />
              <stop offset="100%" stopColor="rgba(122, 133, 240, 0.02)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="rank"
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={14}
            label={{ value: t("gameRank"), position: "bottom", fill: AXIS, fontSize: 10, offset: 10 }}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            unit="%"
            width={44}
          />
          <Tooltip
            formatter={(v, name) => (name === "cumulative_pct" ? [`${v}%`, t("cumulative")] : [`${v}h`, t("totalHours")])}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="cumulative_pct"
            stroke="#7a85f0"
            strokeWidth={2}
            fill="url(#paretoFill)"
            dot={{ r: 2, fill: "#7a85f0", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#98a0ff", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function PlatformPie({ data }: PlatformProps) {
  const { t } = useLocale();
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Panel kicker={t("kickPlatform")} title={t("platformBreakdown")} sub={t("hoursByPlatform")} delay={0.16}>
      <div className="platform-chart">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={110}
              paddingAngle={3}
              cornerRadius={4}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((d) => <Cell key={d.name} fill={dataColor(d.name)} />)}
            </Pie>
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(0)}h`]}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="platform-legend">
          {chartData.map((d) => (
            <div key={d.name} className="legend-item">
              <span className="legend-dot" style={{ background: dataColor(d.name) }} />
              <span>{d.name}: {d.value.toFixed(0)}h ({((d.value / total) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
