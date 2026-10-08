import { Empty, MeterRow, PALETTE, Panel } from "@/components/torgi/parts";
import type { TorgiFunnelStage } from "@/lib/types";

/** Воронка статусов недвижимости: порядок ступеней задаёт бэкенд. */
export function TorgiObjectFunnel({ rows }: { rows: TorgiFunnelStage[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет лотов для воронки.</Empty>
      </Panel>
    );

  const top = Math.max(...rows.map((r) => r.lots), 1);

  return (
    <Panel>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <MeterRow
            key={r.status ?? i}
            label={r.status || "—"}
            value={`${r.lots.toLocaleString("ru-RU")} · ${Math.round(
              (r.lots / top) * 100,
            )}%`}
            share={r.lots / top}
            color={PALETTE[i % PALETTE.length]}
            hint={`${r.lots} лотов — ${Math.round((r.lots / top) * 100)}% от самой массовой ступени`}
          />
        ))}
      </div>
    </Panel>
  );
}
