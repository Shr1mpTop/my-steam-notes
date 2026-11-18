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
import { dataColor } from "../lib/palette";
import { truncate } from "../lib/format";
import { CHART_TOOLTIP_STYLE } from "../lib/ui-constants";
import { Panel } from "./ui";

interface Props {
  activity: RecentActivityItem[];
}

export function RecentActivity({ activity }: Props) {
  const { t } = useLocale();
  if (!activity.length) return null;

  const data = activity
    .map((g) => ({
      ...g,
      label: truncate(g.name, 22),
      color: dataColor(`${g.appid}:${g.name}`),
    }))
    .reverse();

  return (
    <Panel kicker={t("kickRecent")} title={t("recentActivity")} sub={t("recentActivitySubtitle")} delay={0.18}>
      <div className="recent-chart">
        <ResponsiveContainer width="100%" height={Math.max(activity.length * 44 + 44, 320)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
            <XAxis
              type="number"
              unit="h"
              tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: "var(--text-3)", fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v}h`, t("twoWeekPlaytime")]}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={{ color: "var(--accent-hi)", fontWeight: 600 }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="playtime_2weeks_hours" radius={[4, 4, 4, 4]} barSize={20} background={{ fill: "rgba(255,255,255,0.03)", radius: 4 }}>
              {data.map((d) => (
                <Cell key={d.appid} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
