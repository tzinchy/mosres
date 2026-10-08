import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";
import { MONTHS } from "@/components/torgi-objects/parts";
import type { TorgiSeasonPoint } from "@/lib/types";

export function TorgiObjectSeasonality({ rows }: { rows: TorgiSeasonPoint[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет данных о сезонности.</Empty>
      </Panel>
    );

  const by = new Map(rows.map((r) => [r.month_of_year, r.lots]));
  const data = MONTHS.map((label, i) => ({ label, lots: by.get(i + 1) ?? 0 }));

  return (
    <Panel>
      <Chart height="h-56">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 4 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis dataKey="label" {...axis} interval={0} />
          <YAxis allowDecimals={false} width={36} {...axis} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            contentStyle={tooltipStyle}
            formatter={(v) => [v, "Лотов"]}
          />
          <Bar
            dataKey="lots"
            name="Лотов"
            fill="var(--chart-5)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </Chart>
    </Panel>
  );
}
