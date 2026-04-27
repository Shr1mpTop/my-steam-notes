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
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#6d28d9", "#7c3aed", "#9333ea",
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
          <XAxis type="number" unit="h" tick={{ fill: "#94a3b8" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: "#e2e8f0", fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => [`${v}h`, "2-week playtime"]}
            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Bar dataKey="playtime_2weeks_hours" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
