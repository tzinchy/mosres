import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TorgiTimeseriesRow } from "@/hooks/useTorgiDashboard";
import { moneyShort, pct } from "@/lib/format";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";

const MONTHS = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** "2026-03-01" или "2026-03" → "мар 26" */
function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
}

export function TorgiTimeseries({ rows }: { rows: TorgiTimeseriesRow[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет лотов с датой торгов.</Empty>
      </Panel>
    );

  const data = [...rows]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ ...r, label: monthLabel(r.month) }));

  return (
    <Panel>
      <Chart height="h-80">
        <ComposedChart data={data} margin={{ left: 4, right: 8, top: 4 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis dataKey="label" {...axis} minTickGap={16} />
          <YAxis
            yAxisId="lots"
            allowDecimals={false}
            width={36}
            {...axis}
            axisLine={false}
          />
          <YAxis
            yAxisId="money"
            orientation="right"
            width={60}
            tickFormatter={(v) => moneyShort(v)}
            {...axis}
            axisLine={false}
          />
          <YAxis yAxisId="pct" orientation="right" hide />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            contentStyle={tooltipStyle}
            formatter={(v, name) =>
              name === "Сумма итоговых"
                ? [`${moneyShort(Number(v))} ₽`, name]
                : name === "Средний Δ"
                  ? [pct(Number(v)), name]
                  : [v, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="lots"
            dataKey="lots"
            name="Лотов"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="money"
            type="monotone"
            dataKey="sum_final_price"
            name="Сумма итоговых"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="avg_delta_pct"
            name="Средний Δ"
            stroke="var(--chart-3)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </Chart>
    </Panel>
  );
}
