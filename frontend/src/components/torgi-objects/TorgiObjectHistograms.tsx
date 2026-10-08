import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";
import { axisNum } from "@/components/torgi-objects/parts";
import type { TorgiHistBin } from "@/lib/types";

function Hist({
  title,
  help,
  rows,
  color,
}: {
  title: string;
  help: string;
  rows: TorgiHistBin[];
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
            <YAxis
              allowDecimals={false}
              width={46}
              tickFormatter={axisNum}
              {...axis}
              axisLine={false}
            />
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

export function TorgiObjectHistograms({
  area,
  pricePerSquare,
  premium,
  viewsBins,
}: {
  area: TorgiHistBin[];
  pricePerSquare: TorgiHistBin[];
  premium: TorgiHistBin[];
  viewsBins: TorgiHistBin[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <Hist
        title="Площадь"
        help="Распределение лотов по площади объекта, м²."
        rows={area}
        color="var(--chart-1)"
      />
      <Hist
        title="Цена за м²"
        help="Распределение лотов по начальной цене квадратного метра."
        rows={pricePerSquare}
        color="var(--chart-3)"
      />
      <Hist
        title="Просмотры"
        help="Сколько лотов сколько раз посмотрели на портале. Счётчик копится с публикации лота, поэтому длинный хвост — это старые популярные объекты."
        rows={viewsBins}
        color="var(--chart-4)"
      />
      <Hist
        title="Наценка на торгах"
        help="Насколько итоговая цена отличалась от начальной: отрицательные корзины — продано дешевле, положительные — наценка на торгах."
        rows={premium}
        color="var(--chart-2)"
      />
    </div>
  );
}
