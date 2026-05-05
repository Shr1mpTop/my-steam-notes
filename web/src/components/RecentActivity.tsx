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
import { useLocale } from "../useLocale";

interface Props {
  activity: RecentActivityItem[];
}

const COLORS = [
  "var(--palette-0)", "var(--palette-1)", "var(--palette-2)", "var(--palette-3)",
  "var(--palette-4)", "var(--palette-5)", "var(--palette-6)", "var(--palette-7)",
];

export function RecentActivity({ activity }: Props) {
  const { t } = useLocale();
  if (!activity.length) return <p>{t("noRecentActivity")}</p>;

  const data = activity
    .map((g) => ({
      ...g,
      label: g.name.length > 18 ? g.name.slice(0, 17) + "…" : g.name,
    }))
    .reverse();

  return (
    <div className="recent-activity">
      <h2>{t("recentActivity")}</h2>
      <p className="subtitle">{t("recentActivitySubtitle")}</p>
      <ResponsiveContainer width="100%" height={activity.length * 44 + 40}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30 }}>
          <XAxis type="number" unit="h" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={{ stroke: "var(--chart-grid)" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          />
          <Tooltip
            formatter={(v) => [`${v}h`, t("twoWeekPlaytime")]}
            contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", borderRadius: 8, color: "var(--tooltip-text)" }}
            labelStyle={{ color: "var(--chart-accent)" }}
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
