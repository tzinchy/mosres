import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { moneyShort } from "@/lib/format";
import type { BuildingPricePoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRICS = {
  avg_price_m: "Средняя",
  min_price_m: "Минимальная",
  median_price_m: "Медиана",
} as const;
type MetricKey = keyof typeof METRICS;

export function BuildingPriceChart({ points }: { points: BuildingPricePoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("avg_price_m");
  const data = points.map((p) => ({
    date: new Date(p.snapshot_date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    }),
    value: p[metric] === null ? null : Number(p[metric]),
  }));

  return (
    <div>
      <div className="mb-4 flex gap-1">
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
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="bpc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              width={64}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => moneyShort(v)}
            />
            <Tooltip
              formatter={(v) => [`${moneyShort(Number(v))} ₽/м²`, METRICS[metric]]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart)"
              strokeWidth={2}
              fill="url(#bpc)"
              baseValue="dataMin"
              dot={{ r: 2 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
