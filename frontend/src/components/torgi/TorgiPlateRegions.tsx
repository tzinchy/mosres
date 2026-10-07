import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiPoints } from "@/hooks/useTorgiDashboard";
import { Chart, Empty, Panel, axis, tooltipStyle } from "@/components/torgi/parts";

/** Считается на клиенте из /torgi/points — отдельного запроса нет. */
export function TorgiPlateRegions() {
  const { data, isLoading } = useTorgiPoints();

  const rows = useMemo(() => {
    const by = new Map<string, number>();
    for (const p of data ?? []) {
      if (!p.plate_region) continue;
      by.set(p.plate_region, (by.get(p.plate_region) ?? 0) + 1);
    }
    return [...by.entries()]
      .map(([region, lots]) => ({ region, lots }))
      .sort((a, b) => b.lots - a.lots)
      .slice(0, 25);
  }, [data]);

  if (isLoading) return <Skeleton className="h-56 w-full rounded-xl" />;

  return (
    <Panel>
      {rows.length === 0 ? (
        <Empty>Ни у одного лота не разобран регион номера.</Empty>
      ) : (
        <Chart height="h-56">
          <BarChart data={rows} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis dataKey="region" {...axis} interval={0} />
            <YAxis allowDecimals={false} width={36} {...axis} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              contentStyle={tooltipStyle}
              formatter={(v) => [v, "Лотов"]}
              labelFormatter={(l) => `Регион ${l}`}
            />
            <Bar
              dataKey="lots"
              name="Лотов"
              fill="var(--chart-3)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </Chart>
      )}
    </Panel>
  );
}
