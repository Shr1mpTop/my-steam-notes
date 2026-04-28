import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RecentActivityItem } from "../types";

interface Props {
  activity: RecentActivityItem[];
}

const COLORS = [
  "#67e8f9", "#a78bfa", "#34d399", "#f59e0b",
  "#fb7185", "#60a5fa", "#f472b6", "#818cf8",
];

export function RecentActivity({ activity }: Props) {
  if (!activity.length) return <p>No recent activity.</p>;

  const data = activity
    .map((g) => ({
      ...g,
      label: g.name.length > 18 ? g.name.slice(0, 17) + "…" : g.name,
    }))
    .reverse();

  return (
    <div className="recent-activity">
      <h2>Recent Activity</h2>
      <p className="subtitle">Last 2 weeks — hours played</p>
      <ResponsiveContainer width="100%" height={activity.length * 44 + 40}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30 }}>
          <XAxis type="number" unit="h" tick={{ fill: "#667085", fontSize: 10 }} axisLine={{ stroke: "#273244" }} tickLine={{ stroke: "#273244" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: "#96a1b5", fontSize: 10 }}
          />
          <Tooltip
            formatter={(v) => [`${v}h`, "2-week playtime"]}
            contentStyle={{ background: "rgba(9, 11, 16, 0.96)", border: "1px solid rgba(148, 163, 184, 0.24)", borderRadius: 8, color: "#e8edf7" }}
            labelStyle={{ color: "#67e8f9" }}
          />
          <Bar dataKey="playtime_2weeks_hours" radius={[0, 0, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
