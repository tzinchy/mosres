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

const PALETTE = [
  "#4f7686", "#b0763d", "#7d6ca6", "#4f8a6b", "#a1502a", "#5c6b8a",
  "#8a8f98", "#3c8f8f", "#9c6b8a", "#6b8f3c", "#8f6b3c", "#3c6b9c",
];
const ROOM_ORDER = ["Студия", "1-комн", "2-комн", "3-комн", "4-комн", "5-комн"];

type YKey = "price" | "price_m";
type ColorBy = "district" | "rooms";

function PointTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: ScatterPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{p.address}</div>
      <div className="mt-1 text-muted-foreground">
        {p.district} · {p.rooms} · {p.area} м²
      </div>
      <div className="tnum mt-0.5">
        {money(p.price)} ₽{p.price_m ? ` · ${money(p.price_m)} ₽/м²` : ""}
      </div>
    </div>
  );
}

export function ScatterExplorer({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useScatter(favOnly);

  const [yKey, setYKey] = useState<YKey>("price");
  const [colorBy, setColorBy] = useState<ColorBy>("district");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const roomKinds = useMemo(() => {
    const s = new Set((data ?? []).map((p) => p.rooms));
    return ROOM_ORDER.filter((r) => s.has(r));
  }, [data]);

  const groups = useMemo(() => {
    const pts = (data ?? []).filter((p) => !hidden.has(p.rooms));
    const by = new Map<string, ScatterPoint[]>();
    for (const p of pts) {
      const k = p[colorBy];
      const arr = by.get(k) ?? [];
      arr.push(p);
      by.set(k, arr);
    }
    return [...by.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [data, hidden, colorBy]);

  return (
    <div className="rounded-xl bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(
            [
              ["price", "Цена"],
              ["price_m", "Цена м²"],
            ] as [YKey, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setYKey(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                yKey === k
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">цвет:</span>
        <div className="flex gap-1">
          {(
            [
              ["district", "округ"],
              ["rooms", "комнатность"],
            ] as [ColorBy, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setColorBy(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                colorBy === k
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {roomKinds.map((r) => {
          const on = !hidden.has(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() =>
                setHidden((h) => {
                  const n = new Set(h);
                  n.has(r) ? n.delete(r) : n.add(r);
                  return n;
                })
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                on
                  ? "border-primary bg-primary/15 font-medium text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {r}
            </button>
          );
        })}
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}
      {data && data.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Нет данных.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="h-96 w-full">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis
                type="number"
                dataKey="area"
                name="Площадь"
                unit=" м²"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="number"
                dataKey={yKey}
                name={yKey === "price" ? "Цена" : "Цена м²"}
                width={54}
                tickFormatter={(v) => moneyShort(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis range={[18, 18]} />
              <Tooltip content={<PointTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {groups.map(([key, pts], i) => (
                <Scatter
                  key={key}
                  name={key}
                  data={pts}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.6}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
