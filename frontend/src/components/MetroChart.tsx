import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { moneyShort } from "@/lib/format";
import type { MetroStat } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRICS = {
  count: "Квартир",
  discount: "Со скидкой",
  favorites: "В избранном",
  price_m: "Средняя цена м²",
} as const;
type MetricKey = keyof typeof METRICS;

const VALUE: Record<MetricKey, (r: MetroStat) => number> = {
  count: (r) => r.aparts,
  discount: (r) => r.with_discount,
  favorites: (r) => r.favorites,
  price_m: (r) => r.avg_price_m ?? 0,
};

export function MetroChart({ rows }: { rows: MetroStat[] }) {
  const [metric, setMetric] = useState<MetricKey>("discount");
  const pick = VALUE[metric];
  const money = metric === "price_m";

  const data = [...rows]
    .filter((r) => pick(r) > 0)
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, 12)
    .map((r) => ({ name: r.name ?? "—", value: pick(r) }))
    .reverse();

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.entries(METRICS) as [MetricKey, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMetric(k)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              metric === k
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tickFormatter={money ? (v) => moneyShort(v) : undefined}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              formatter={(v) => [
                money ? `${moneyShort(Number(v))} ₽` : v,
                METRICS[metric],
              ]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="value"
              name={METRICS[metric]}
              fill={money ? "var(--chart-1)" : "var(--pos)"}
              radius={[0, 3, 3, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
