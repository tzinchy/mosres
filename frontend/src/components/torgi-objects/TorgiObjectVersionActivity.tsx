import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";
import { axisNum } from "@/components/torgi-objects/parts";
import { shortDate } from "@/lib/format";
import type { TorgiVersionActivity as Activity } from "@/lib/types";

export function TorgiObjectVersionActivity({
  activity,
}: {
  activity: Activity;
}) {
  const buckets = activity?.versions ?? [];
  const byDay = (activity?.changes_by_day ?? []).map((d) => ({
    ...d,
    label: shortDate(d.day),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Версий на лот"
        help="Сколько лотов имеет столько-то версий в истории: один столбец — лоты, которые портал правил одинаковое число раз."
      >
        {buckets.length === 0 ? (
          <Empty />
        ) : (
          <Chart height="h-48">
            <BarChart
              data={buckets.map((b) => ({
                label:
                  b.bucket === null || b.bucket === undefined
                    ? "—"
                    : String(b.bucket),
                lots: b.lots,
              }))}
              margin={{ left: 4, right: 8, top: 4 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis dataKey="label" {...axis} interval={0} />
              <YAxis allowDecimals={false} width={46} tickFormatter={axisNum} {...axis} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={tooltipStyle}
                formatter={(v) => [v, "Лотов"]}
              />
              <Bar
                dataKey="lots"
                name="Лотов"
                fill="var(--chart-4)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </Chart>
        )}
      </Panel>

      <Panel
        title="Изменения по дням, 90 дней"
        help="Сколько строк истории появилось в каждый день — активность портала по правкам лотов недвижимости."
      >
        {byDay.length === 0 ? (
          <Empty />
        ) : (
          <Chart height="h-48">
            <AreaChart data={byDay} margin={{ left: 4, right: 8, top: 4 }}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis allowDecimals={false} width={46} tickFormatter={axisNum} {...axis} axisLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v, "Изменений"]}
              />
              <Area
                type="monotone"
                dataKey="changes"
                name="Изменений"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </Chart>
        )}
      </Panel>
    </div>
  );
}
