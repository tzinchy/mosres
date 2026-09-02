import { useMemo } from "react";
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
import { moneyShort } from "@/lib/format";
import type { PriceHistoryPoint } from "@/lib/types";

const COLORS = [
  "#0f3e17",
  "#2f7d3a",
  "#5b7a86",
  "#a1502a",
  "#7a9b5c",
  "#3c6e71",
  "#8a6d3b",
];

export function PriceHistoryChart({ points }: { points: PriceHistoryPoint[] }) {
  const { data, districts } = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    const dset = new Set<string>();
    for (const p of points) {
      dset.add(p.district);
      const row = byDay.get(p.day) ?? { day: p.day };
      if (p.avg_price_m != null) row[p.district] = p.avg_price_m;
      byDay.set(p.day, row);
    }
    const arr = [...byDay.values()].sort((a, b) =>
      String(a.day).localeCompare(String(b.day)),
    );
    return { data: arr, districts: [...dset].sort() };
  }, [points]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 6, right: 10, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
            }
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={28}
          />
          <YAxis
            width={54}
            tickFormatter={(v) => moneyShort(v)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v, name) => [`${moneyShort(Number(v))} ₽/м²`, name]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {districts.map((d, i) => (
            <Line
              key={d}
              type="monotone"
              dataKey={d}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
