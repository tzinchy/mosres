import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardPivot } from "@/hooks/useDashboard";
import { moneyShort, shortDate } from "@/lib/format";
import type { PivotDimension, PivotMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIMS: Record<PivotDimension, string> = {
  date: "По датам",
  district: "По округам",
  rooms: "По комнатности",
  building: "По домам",
};
const METRICS: Record<PivotMetric, string> = {
  count: "Количество квартир",
  reserved: "В резерве",
  discounted: "Со скидкой",
  family: "По семейной ипотеке",
  avg_price: "Средняя цена",
  avg_price_m: "Средняя цена м²",
};
const MONEY: PivotMetric[] = ["avg_price", "avg_price_m"];

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

export function PivotChart({
  favOnly,
  dateFrom,
  dateTo,
}: {
  favOnly: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [dimension, setDimension] = useState<PivotDimension>("district");
  const [metric, setMetric] = useState<PivotMetric>("count");
  const [type, setType] = useState<"line" | "bar">("bar");

  const { data, isLoading } = useDashboardPivot(
    dimension,
    metric,
    favOnly,
    dateFrom,
    dateTo,
  );

  const money = MONEY.includes(metric);
  const isDate = dimension === "date";

  const rows = (data ?? [])
    .map((p) => ({
      key: isDate ? shortDate(p.key) : p.key,
      value: p.value ?? 0,
    }))
    .sort((a, b) => (isDate ? 0 : b.value - a.value))
    .slice(0, isDate ? undefined : 15);

  const fmt = money ? (v: number) => moneyShort(v) : undefined;
  const chartType = isDate ? type : type === "line" ? "line" : "bar";

  return (
    <div className="rounded-xl bg-panel p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={dimension} onChange={setDimension} options={DIMS} />
        <Select value={metric} onChange={setMetric} options={METRICS} />
        <div className="flex gap-1">
          {(["bar", "line"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                type === t
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "bar" ? "Столбцы" : "Линия"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-72 w-full" />}
      {data && rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Нет данных для этого разреза.
        </p>
      )}

      {data && rows.length > 0 && (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            {chartType === "line" ? (
              <LineChart data={rows} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  minTickGap={20}
                />
                <YAxis
                  width={money ? 52 : 36}
                  tickFormatter={fmt}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => [money ? `${moneyShort(Number(v))} ₽` : v, METRICS[metric]]}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={METRICS[metric]}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={!isDate}
                />
              </LineChart>
            ) : (
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ left: 8, right: 12 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={fmt}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  type="category"
                  dataKey="key"
                  width={140}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  formatter={(v) => [money ? `${moneyShort(Number(v))} ₽` : v, METRICS[metric]]}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="value"
                  name={METRICS[metric]}
                  fill="var(--chart-1)"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;
