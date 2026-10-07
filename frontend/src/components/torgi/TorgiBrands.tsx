import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TorgiBrandRow } from "@/hooks/useTorgiDashboard";
import { money, pct } from "@/lib/format";
import { Chart, Empty, Panel, axis } from "@/components/torgi/parts";

function BrandTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const r: TorgiBrandRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{r.brand || "—"}</div>
      <div className="tnum mt-1 text-muted-foreground">
        {r.lots.toLocaleString("ru-RU")} лот(ов)
      </div>
      <div className="tnum">средняя начальная {money(r.avg_start_price)} ₽</div>
      <div className="tnum">средний Δ {pct(r.avg_delta_pct)}</div>
    </div>
  );
}

export function TorgiBrands({ rows }: { rows: TorgiBrandRow[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет данных по маркам.</Empty>
      </Panel>
    );

  const data = [...rows]
    .sort((a, b) => b.lots - a.lots)
    .slice(0, 15)
    .map((r) => ({ ...r, label: r.brand || "—" }));

  return (
    <Panel>
      <Chart height="h-80">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            horizontal={false}
          />
          <XAxis type="number" allowDecimals={false} {...axis} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            {...axis}
            tick={{ fontSize: 11, fill: "var(--foreground)" }}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--secondary)" }} content={<BrandTooltip />} />
          <Bar
            dataKey="lots"
            name="Лотов"
            fill="var(--chart-1)"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </Chart>
      <p className="mt-2 text-xs text-muted-foreground">
        Столбец — число лотов; средняя начальная цена и средний Δ% — в подсказке.
      </p>
    </Panel>
  );
}
