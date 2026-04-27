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
  "#00ff41", "#00cc33", "#009926", "#006619",
  "#00ff41", "#00cc33", "#009926", "#006619",
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
          <XAxis type="number" unit="h" tick={{ fill: "#005500", fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: "#00cc33", fontSize: 10 }}
          />
          <Tooltip
            formatter={(v) => [`${v}h`, "2-week playtime"]}
            contentStyle={{ background: "#000", border: "1px solid #003b00", borderRadius: 0 }}
            labelStyle={{ color: "#00ff41" }}
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
