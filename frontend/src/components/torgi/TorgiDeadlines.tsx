import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TorgiDeadlineRow } from "@/hooks/useTorgiDashboard";
import { money, shortDate } from "@/lib/format";
import { Chart, Empty, LotList, LotRow, Panel, axis } from "@/components/torgi/parts";
import { cn } from "@/lib/utils";

/** Цвета срочности как в DeadlinesChart квартир. */
function barColor(days: number) {
  if (days < 0) return "var(--chart-4)";
  if (days <= 3) return "var(--neg)";
  if (days <= 7) return "var(--chart-2)";
  return "var(--chart-1)";
}

function DeadlineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const r: TorgiDeadlineRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{r.name || `Лот ${r.lot_id}`}</div>
      <div className="tnum mt-1 text-muted-foreground">
        приём до {r.request_end_date ? shortDate(r.request_end_date) : "—"} ·
        осталось {r.days_left ?? "—"} дн
      </div>
      <div className="tnum">{money(r.start_price)} ₽</div>
    </div>
  );
}

export function TorgiDeadlines({ rows }: { rows: TorgiDeadlineRow[] }) {
  const navigate = useNavigate();

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

  return (
    <Panel>
      <Chart height="h-56">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 4 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis dataKey="label" {...axis} interval={0} minTickGap={8} />
          <YAxis
            allowDecimals={false}
            width={36}
            {...axis}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--secondary)" }} content={<DeadlineTooltip />} />
          <Bar
            dataKey="days"
            name="Осталось дней"
            radius={[3, 3, 0, 0]}
            onClick={(d: any) =>
              d?.payload?.lot_id && navigate(`/torgi/cars/${d.payload.lot_id}`)
            }
          >
            {data.map((d) => (
              <Cell key={d.lot_id} fill={barColor(d.days)} />
            ))}
          </Bar>
        </BarChart>
      </Chart>

      <div className="mt-4">
        <LotList>
          {data.map((r) => (
            <LotRow
              key={r.lot_id}
              lotId={r.lot_id}
              title={r.name}
              sub={`приём до ${r.label} · ${money(r.start_price)} ₽`}
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
      </div>
    </Panel>
  );
}
