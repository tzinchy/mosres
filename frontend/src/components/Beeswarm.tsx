import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useScatter } from "@/hooks/useDashboard";
import { money, moneyShort } from "@/lib/format";
import type { ScatterPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROOM_ORDER = ["Студия", "1-комн", "2-комн", "3-комн", "4-комн", "5-комн"];
const ROOM_COLOR: Record<string, string> = {
  Студия: "#8a8f98",
  "1-комн": "#4f7686",
  "2-комн": "#4f8a6b",
  "3-комн": "#b0763d",
  "4-комн": "#7d6ca6",
  "5-комн": "#a1502a",
};

type XKey = "price" | "price_m";

// deterministic jitter in [-0.35, 0.35] from the apartment id
function jitter(id: number) {
  const h = (id * 2654435761) % 1000;
  return (h / 1000 - 0.5) * 0.7;
}

export function Beeswarm({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useScatter(favOnly);
  const [xKey, setXKey] = useState<XKey>("price_m");

  // fixed district order (by apartment count) — does not change when the
  // metric toggles, so rows stay put
  const districts = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of data ?? []) n.set(p.district, (n.get(p.district) ?? 0) + 1);
    return [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)!);
  }, [data]);

  const { rows } = useMemo(() => {
    const pts = (data ?? []).filter((p) => (p[xKey] ?? 0) > 0);
    const yIndex = new Map(districts.map((d, i) => [d, i]));
    const rows = pts
      .filter((p) => yIndex.has(p.district))
      .map((p) => ({
        ...p,
        x: p[xKey] as number,
        y: yIndex.get(p.district)! + jitter(p.new_apart_id),
      }));
    return { rows };
  }, [data, xKey, districts]);

  const groups = ROOM_ORDER.filter((r) => rows.some((p) => p.rooms === r)).map(
    (r) => [r, rows.filter((p) => p.rooms === r)] as const,
  );

  if (isLoading) return <Skeleton className="h-[460px] w-full rounded-xl" />;
  if (!data || rows.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Нет данных.
      </p>
    );

  return (
    <div className="rounded-xl bg-panel p-4">
      <div className="mb-3 flex gap-1">
        {(
          [
            ["price_m", "Цена за м²"],
            ["price", "Цена"],
          ] as [XKey, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setXKey(k)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              xKey === k
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ height: 56 + districts.length * 46 }} className="w-full">
        <ResponsiveContainer>
          <ScatterChart margin={{ left: 8, right: 16, top: 4, bottom: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              dataKey="x"
              tickFormatter={(v) => moneyShort(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              type="number"
              dataKey="y"
              width={90}
              domain={[-0.6, districts.length - 0.4]}
              ticks={districts.map((_, i) => i)}
              tickFormatter={(i) => districts[i] ?? ""}
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <ZAxis range={[16, 16]} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const p: ScatterPoint = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium">{p.address}</div>
                    <div className="mt-1 text-muted-foreground">
                      {p.district} · {p.rooms} · {p.area} м²
                    </div>
                    <div className="tnum mt-0.5">
                      {money(p.price)} ₽
                      {p.price_m ? ` · ${money(p.price_m)} ₽/м²` : ""}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {groups.map(([room, pts]) => (
              <Scatter
                key={room}
                name={room}
                data={pts}
                fill={ROOM_COLOR[room] ?? "var(--chart-4)"}
                fillOpacity={0.55}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
