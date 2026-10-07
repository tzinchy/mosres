import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TORGI_PIVOT_DIMENSIONS,
  useTorgiPivot,
  type TorgiPivotDimension,
  type TorgiPivotRow,
} from "@/hooks/useTorgiDashboard";
import { money, moneyShort, pct } from "@/lib/format";
import { Chart, Empty, Panel, axis } from "@/components/torgi/parts";

type MetricKey =
  | "lots"
  | "open_lots"
  | "sold_lots"
  | "avg_start"
  | "median_start"
  | "avg_final"
  | "avg_delta_pct"
  | "avg_mileage"
  | "avg_power"
  | "rub_per_hp";

const METRICS: Record<MetricKey, { label: string; kind: "count" | "money" | "pct" }> = {
  lots: { label: "Лотов", kind: "count" },
  open_lots: { label: "В приёме заявок", kind: "count" },
  sold_lots: { label: "Продано", kind: "count" },
  avg_start: { label: "Средняя начальная", kind: "money" },
  median_start: { label: "Медианная начальная", kind: "money" },
  avg_final: { label: "Средняя итоговая", kind: "money" },
  avg_delta_pct: { label: "Средний Δ итог/начало", kind: "pct" },
  avg_mileage: { label: "Средний пробег", kind: "count" },
  avg_power: { label: "Средняя мощность, л.с.", kind: "count" },
  rub_per_hp: { label: "Рублей за л.с.", kind: "money" },
};

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 rounded-md border border-border bg-card px-2 text-xs"
    >
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

function PivotTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: any[];
  metric: MetricKey;
}) {
  if (!active || !payload?.length) return null;
  const r: TorgiPivotRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{r.key || "—"}</div>
      <div className="tnum mt-1 space-y-0.5 text-muted-foreground">
        <div>
          {r.lots.toLocaleString("ru-RU")} лот(ов) · в приёме {r.open_lots} ·
          продано {r.sold_lots}
        </div>
        <div>начальная: средняя {money(r.avg_start)} · медиана {money(r.median_start)}</div>
        <div>итоговая {money(r.avg_final)} · Δ {pct(r.avg_delta_pct)}</div>
        <div>
          пробег {money(r.avg_mileage)} · {money(r.avg_power)} л.с. ·{" "}
          {money(r.rub_per_hp)} ₽/л.с.
        </div>
      </div>
      <div className="mt-1 font-medium">
        {METRICS[metric].label}: {fmt(r[metric], metric)}
      </div>
    </div>
  );
}

function fmt(v: number | null, metric: MetricKey): string {
  const kind = METRICS[metric].kind;
  if (v === null || v === undefined) return "—";
  if (kind === "money") return `${money(v)} ₽`;
  if (kind === "pct") return pct(v);
  return money(v);
}

/** Один виджет вместо десятка графиков: разрез + показатель. */
export function TorgiPivot() {
  const [dimension, setDimension] = useState<TorgiPivotDimension>("brand");
  const [metric, setMetric] = useState<MetricKey>("lots");
  const { data, isLoading } = useTorgiPivot(dimension);

  const metricLabels = Object.fromEntries(
    (Object.keys(METRICS) as MetricKey[]).map((k) => [k, METRICS[k].label]),
  ) as Record<MetricKey, string>;

  const rows = (data ?? [])
    .map((r) => ({ ...r, label: r.key || "—", value: r[metric] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const isMoney = METRICS[metric].kind === "money";

  return (
    <Panel
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={dimension}
            onChange={setDimension}
            options={TORGI_PIVOT_DIMENSIONS as Record<TorgiPivotDimension, string>}
          />
          <Select value={metric} onChange={setMetric} options={metricLabels} />
        </div>
      }
    >
      {isLoading && <Skeleton className="h-80 w-full" />}
      {data && rows.length === 0 && <Empty>Нет данных для этого разреза.</Empty>}
      {data && rows.length > 0 && (
        <Chart height="h-96">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="2 4"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={isMoney ? (v) => moneyShort(v) : undefined}
              {...axis}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              {...axis}
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              content={<PivotTooltip metric={metric} />}
            />
            <Bar
              dataKey="value"
              name={METRICS[metric].label}
              fill="var(--chart-1)"
              radius={[0, 3, 3, 0]}
            />
          </BarChart>
        </Chart>
      )}
    </Panel>
  );
}
