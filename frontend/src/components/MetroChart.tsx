import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetroStat } from "@/lib/types";

export function MetroChart({ rows }: { rows: MetroStat[] }) {
  const data = [...rows]
    .sort((a, b) => b.with_discount - a.with_discount || b.aparts - a.aparts)
    .slice(0, 12)
    .map((r) => ({
      name: r.name ?? "—",
      "Со скидкой": r.with_discount,
      "В избранном": r.favorites,
      Всего: r.aparts,
    }))
    .reverse();

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
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
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Bar dataKey="Всего" fill="var(--muted-foreground)" radius={[0, 3, 3, 0]} />
          <Bar dataKey="Со скидкой" fill="var(--pos)" radius={[0, 3, 3, 0]} />
          <Bar dataKey="В избранном" fill="var(--primary)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
