import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPoint } from "@/lib/types";

const SERIES = [
  { key: "drops", label: "Подешевели", color: "var(--pos)" },
  { key: "rises", label: "Подорожали", color: "var(--neg)" },
  { key: "new_discounts", label: "Новые скидки", color: "var(--chart-3)" },
  { key: "new_aparts", label: "Новые", color: "var(--chart-1)" },
] as const;

export function DashboardChart({ points }: { points: DashboardPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: new Date(p.day).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="h-72 w-full rounded-xl bg-panel p-4">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
