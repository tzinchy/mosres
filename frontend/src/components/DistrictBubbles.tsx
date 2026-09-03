import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreakdown } from "@/hooks/useDashboard";
import { money, moneyShort } from "@/lib/format";

export function DistrictBubbles({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useBreakdown("district", favOnly);

  if (isLoading) return <Skeleton className="h-80 w-full rounded-xl" />;
  if (!data || data.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Нет данных.
      </p>
    );

  const rows = data
    .filter((d) => d.avg_price_m)
    .map((d) => ({
      name: d.key,
      x: d.avg_price_m ?? 0,
      y: d.count,
      z: d.count,
      avg_price: d.avg_price,
    }));

  return (
    <div className="h-80 w-full rounded-xl bg-panel p-4">
      <ResponsiveContainer>
        <ScatterChart margin={{ left: 8, right: 24, top: 16, bottom: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="x"
            name="Средняя цена м²"
            tickFormatter={(v) => moneyShort(v)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Квартир"
            width={44}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <ZAxis type="number" dataKey="z" range={[120, 2200]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="font-medium">{p.name}</div>
                  <div className="tnum mt-1 text-muted-foreground">
                    {p.y} кв. · {money(p.x)} ₽/м²
                    {p.avg_price ? ` · ср. ${moneyShort(p.avg_price)} ₽` : ""}
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={rows} fill="var(--chart-1)" fillOpacity={0.5}>
            <LabelList
              dataKey="name"
              position="top"
              style={{ fontSize: 11, fill: "var(--foreground)" }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
