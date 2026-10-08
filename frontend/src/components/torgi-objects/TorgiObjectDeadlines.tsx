import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Chart, Empty, LotList, Panel, axis } from "@/components/torgi/parts";
import { ObjectRow } from "@/components/torgi-objects/parts";
import { money, shortDate } from "@/lib/format";
import type { TorgiObjectDeadlineRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Цвета срочности те же, что в сводке транспорта. */
function barColor(days: number) {
  if (days < 0) return "var(--chart-4)";
  if (days <= 3) return "var(--neg)";
  if (days <= 7) return "var(--chart-2)";
  return "var(--chart-1)";
}

interface DayBar {
  label: string;
  days: number;
  lots: number;
}

function DeadlineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: DayBar = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">приём заявок до {d.label}</div>
      <div className="tnum mt-1 text-muted-foreground">
        закрывается лотов: {d.lots} · осталось {d.days} дн
      </div>
    </div>
  );
}

export function TorgiObjectDeadlines({
  rows,
}: {
  rows: TorgiObjectDeadlineRow[];
}) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет открытых сроков подачи заявок.</Empty>
      </Panel>
    );

  const data = rows.map((r) => ({
    ...r,
    days: r.days_left ?? 0,
    label: r.request_end_date ? shortDate(r.request_end_date) : "—",
  }));
  // столбец — день, в который закрывается приём заявок, высота — сколько лотов
  const byDay: DayBar[] = [];
  for (const r of data) {
    const bar = byDay.find((d) => d.label === r.label);
    if (bar) bar.lots += 1;
    else byDay.push({ label: r.label, days: r.days, lots: 1 });
  }
  const shown = showAll ? data : data.slice(0, 8);

  return (
    <Panel>
      <Chart height="h-56">
        <BarChart data={byDay} margin={{ left: 4, right: 8, top: 4 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} width={36} {...axis} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            content={<DeadlineTooltip />}
          />
          <Bar dataKey="lots" name="Лотов" radius={[3, 3, 0, 0]}>
            {byDay.map((d) => (
              <Cell key={d.label} fill={barColor(d.days)} />
            ))}
          </Bar>
        </BarChart>
      </Chart>

      <div className="mt-4">
        <LotList>
          {shown.map((r) => (
            <ObjectRow
              key={r.lot_id}
              lotId={r.lot_id}
              title={r.name}
              sub={`${[r.object_type_name, r.short_address]
                .filter(Boolean)
                .join(" · ")} · приём до ${r.label} · ${money(r.start_price)} ₽`}
              right={
                <span
                  className={cn(
                    "tnum rounded-md px-1.5 py-0.5 text-xs",
                    r.days <= 3
                      ? "bg-neg-soft text-neg"
                      : r.days <= 7
                        ? "bg-reserve-soft text-reserve"
                        : "text-muted-foreground",
                  )}
                >
                  {r.days_left === null || r.days_left === undefined
                    ? "—"
                    : `${r.days_left} дн`}
                </span>
              }
            />
          ))}
        </LotList>
        {data.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {showAll ? "свернуть" : `показать все ${data.length}`}
          </button>
        )}
      </div>
    </Panel>
  );
}
