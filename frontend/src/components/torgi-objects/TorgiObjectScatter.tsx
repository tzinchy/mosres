import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Chart, Empty, PALETTE, Panel, axis } from "@/components/torgi/parts";
import { views } from "@/components/torgi-objects/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiObjectPoints } from "@/hooks/useTorgiObjects";
import { money, moneyShort } from "@/lib/format";
import type { TorgiObjectPoint } from "@/lib/types";

type AxisKey =
  | "object_area"
  | "start_price"
  | "price_per_square"
  | "rooms_count"
  | "portal_views";

const AXES: Record<AxisKey, { label: string; money?: boolean }> = {
  object_area: { label: "Площадь, м²" },
  start_price: { label: "Начальная цена", money: true },
  price_per_square: { label: "Цена за м²", money: true },
  rooms_count: { label: "Комнат" },
  portal_views: { label: "Просмотры" },
};

const COLOR_BY = {
  object_type_name: "тип объекта",
  live: "актуальность",
} as const;
type ColorBy = keyof typeof COLOR_BY;

function PointTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: TorgiObjectPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">
        {p.object_type_name || `Лот ${p.lot_id}`}
      </div>
      <div className="mt-1 text-muted-foreground">{p.short_address || "—"}</div>
      <div className="tnum mt-0.5">
        {money(p.start_price)} ₽
        {p.price_per_square ? ` · ${money(p.price_per_square)} ₽/м²` : ""}
      </div>
      <div className="tnum text-muted-foreground">
        {p.object_area ? `${p.object_area} м² · ` : ""}
        {p.rooms_count ? `${p.rooms_count} комн. · ` : ""}
        {views(p.portal_views)}
      </div>
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 rounded-md border border-border bg-card px-2 text-xs"
    >
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function TorgiObjectScatter() {
  const { data, isLoading } = useTorgiObjectPoints();
  const [xKey, setXKey] = useState<AxisKey>("object_area");
  const [yKey, setYKey] = useState<AxisKey>("start_price");
  const [colorBy, setColorBy] = useState<ColorBy>("object_type_name");

  const axisLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(AXES) as AxisKey[]).map((k) => [k, AXES[k].label]),
      ) as Record<AxisKey, string>,
    [],
  );

  const groups = useMemo(() => {
    const rows = (data ?? []).filter(
      (p) => p[xKey] != null && p[yKey] != null,
    );
    const by = new Map<string, TorgiObjectPoint[]>();
    for (const p of rows) {
      const k =
        colorBy === "live"
          ? p.is_live
            ? "актуальные"
            : "архив"
          : p.object_type_name || "—";
      const arr = by.get(k) ?? [];
      arr.push(p);
      by.set(k, arr);
    }
    return [...by.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12);
  }, [data, xKey, yKey, colorBy]);

  const total = groups.reduce((s, [, pts]) => s + pts.length, 0);

  return (
    <Panel
      right={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">x:</span>
          <Toggle value={xKey} onChange={setXKey} options={axisLabels} />
          <span className="text-xs text-muted-foreground">y:</span>
          <Toggle value={yKey} onChange={setYKey} options={axisLabels} />
          <span className="text-xs text-muted-foreground">цвет:</span>
          <Toggle
            value={colorBy}
            onChange={setColorBy}
            options={COLOR_BY as Record<ColorBy, string>}
          />
        </div>
      }
    >
      {isLoading && <Skeleton className="h-96 w-full" />}
      {data && total === 0 && (
        <Empty>Нет лотов с заполненными обеими осями.</Empty>
      )}
      {data && total > 0 && (
        <>
          <Chart height="h-96">
            <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis
                type="number"
                dataKey={xKey}
                name={AXES[xKey].label}
                tickFormatter={AXES[xKey].money ? (v) => moneyShort(v) : undefined}
                domain={["auto", "auto"]}
                {...axis}
              />
              <YAxis
                type="number"
                dataKey={yKey}
                name={AXES[yKey].label}
                width={64}
                tickFormatter={AXES[yKey].money ? (v) => moneyShort(v) : undefined}
                domain={["auto", "auto"]}
                {...axis}
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
          </Chart>
          <p className="tnum mt-2 text-xs text-muted-foreground">
            {AXES[xKey].label} × {AXES[yKey].label} ·{" "}
            {total.toLocaleString("ru-RU")} лотов · цвет: {COLOR_BY[colorBy]}
          </p>
        </>
      )}
    </Panel>
  );
}
