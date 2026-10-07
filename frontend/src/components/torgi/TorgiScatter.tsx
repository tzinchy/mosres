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
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiPoints, type TorgiPoint } from "@/hooks/useTorgiDashboard";
import { money, moneyShort, pct } from "@/lib/format";
import { Chart, Empty, PALETTE, Panel, axis } from "@/components/torgi/parts";

type AxisKey =
  | "mileage"
  | "year"
  | "power_hp"
  | "engine_volume"
  | "start_price"
  | "final_price"
  | "delta_pct"
  | "portal_views"
  | "rub_per_hp"
  | "rub_per_km";

const AXES: Record<AxisKey, { label: string; money?: boolean }> = {
  mileage: { label: "Пробег" },
  year: { label: "Год выпуска" },
  power_hp: { label: "Мощность, л.с." },
  engine_volume: { label: "Объём двигателя" },
  start_price: { label: "Начальная цена", money: true },
  final_price: { label: "Итоговая цена", money: true },
  delta_pct: { label: "Δ итог/начало, %" },
  portal_views: { label: "Просмотры" },
  rub_per_hp: { label: "₽ за л.с.", money: true },
  rub_per_km: { label: "₽ за км пробега", money: true },
};

const COLOR_BY = {
  category: "категория",
  brand: "марка",
  status_text: "статус",
  plate_region: "регион номера",
} as const;
type ColorBy = keyof typeof COLOR_BY;

type Row = TorgiPoint & { rub_per_hp: number | null; rub_per_km: number | null };

function derive(p: TorgiPoint): Row {
  const price = p.start_price;
  return {
    ...p,
    rub_per_hp: price && p.power_hp ? price / p.power_hp : null,
    rub_per_km: price && p.mileage ? price / p.mileage : null,
  };
}

function PointTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{p.name || `Лот ${p.lot_id}`}</div>
      <div className="mt-1 text-muted-foreground">
        {[p.brand, p.model, p.year, p.category].filter(Boolean).join(" · ") || "—"}
      </div>
      <div className="tnum mt-0.5">
        {money(p.start_price)} ₽
        {p.final_price ? ` → ${money(p.final_price)} ₽` : ""}
        {p.delta_pct != null ? ` · ${pct(p.delta_pct)}` : ""}
      </div>
      <div className="tnum text-muted-foreground">
        {p.mileage != null ? `${money(p.mileage)} км · ` : ""}
        {p.power_hp != null ? `${p.power_hp} л.с.` : ""}
        {p.plate_norm ? ` · ${p.plate_norm}` : ""}
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

export function TorgiScatter() {
  const { data, isLoading } = useTorgiPoints();
  const [xKey, setXKey] = useState<AxisKey>("mileage");
  const [yKey, setYKey] = useState<AxisKey>("start_price");
  const [colorBy, setColorBy] = useState<ColorBy>("category");

  const axisLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(AXES) as AxisKey[]).map((k) => [k, AXES[k].label]),
      ) as Record<AxisKey, string>,
    [],
  );

  const groups = useMemo(() => {
    const rows = (data ?? [])
      .map(derive)
      .filter((p) => p[xKey] != null && p[yKey] != null);
    const by = new Map<string, Row[]>();
    for (const p of rows) {
      const k = p[colorBy] || "—";
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
                width={60}
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
            {AXES[xKey].label} × {AXES[yKey].label} · {total.toLocaleString("ru-RU")}{" "}
            лотов · цвет: {COLOR_BY[colorBy]}
          </p>
        </>
      )}
    </Panel>
  );
}
