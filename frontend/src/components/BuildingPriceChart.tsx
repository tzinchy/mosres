import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BuildingPricePoint } from "@/lib/types";

const METRICS = {
  avg_price_m: "Средняя",
  min_price_m: "Минимальная",
  median_price_m: "Медиана",
} as const;
type MetricKey = keyof typeof METRICS;

export function BuildingPriceChart({ points }: { points: BuildingPricePoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("avg_price_m");
  const data = points.map((p) => ({
    date: p.snapshot_date,
    value: p[metric] === null ? null : Number(p[metric]),
  }));

  return (
    <div>
      <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
        <TabsList>
          {Object.entries(METRICS).map(([k, label]) => (
            <TabsTrigger key={k} value={k}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              width={80}
              tickFormatter={(v) => new Intl.NumberFormat("ru-RU").format(v)}
            />
            <Tooltip
              formatter={(v) =>
                `${new Intl.NumberFormat("ru-RU").format(Number(v))} ₽/м²`
              }
            />
            <Line type="monotone" dataKey="value" stroke="currentColor" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
