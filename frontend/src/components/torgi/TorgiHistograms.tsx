import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { TorgiBucketRow } from "@/hooks/useTorgiDashboard";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";

function Hist({
  title,
  help,
  rows,
  color,
}: {
  title: string;
  help: string;
  rows: TorgiBucketRow[];
  color: string;
}) {
  const data = rows.map((r) => ({
    label: r.bucket === null || r.bucket === undefined ? "—" : String(r.bucket),
    lots: r.lots,
  }));

  return (
    <Panel title={title} help={help}>
      {data.length === 0 ? (
        <Empty />
      ) : (
        <Chart height="h-48">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              {...axis}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={46}
            />
            <YAxis allowDecimals={false} width={32} {...axis} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              contentStyle={tooltipStyle}
              formatter={(v) => [v, "Лотов"]}
            />
            <Bar dataKey="lots" name="Лотов" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </Chart>
      )}
    </Panel>
  );
}

export function TorgiHistograms({
  discount,
  year,
  mileage,
}: {
  discount: TorgiBucketRow[];
  year: TorgiBucketRow[];
  mileage: TorgiBucketRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Hist
        title="Δ итог/начало"
        help="Как итоговая цена отличалась от начальной: отрицательные корзины — продано дешевле начальной, положительные — наценка на торгах."
        rows={discount}
        color="var(--chart-2)"
      />
      <Hist
        title="Год выпуска"
        help="Распределение лотов по году выпуска транспорта."
        rows={year}
        color="var(--chart-1)"
      />
      <Hist
        title="Пробег"
        help="Распределение лотов по пробегу."
        rows={mileage}
        color="var(--chart-3)"
      />
    </div>
  );
}
