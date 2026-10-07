import { Link } from "react-router-dom";
import type { TorgiPlateFlavorRow } from "@/hooks/useTorgiDashboard";
import { Empty, MeterRow, PALETTE, Panel } from "@/components/torgi/parts";

/** Сколько лотов попадает под каждый пресет «интересного» номера. */
export function TorgiPlateFlavors({ rows }: { rows: TorgiPlateFlavorRow[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Пресеты номеров пока ничего не нашли.</Empty>
      </Panel>
    );

  const sorted = [...rows].sort((a, b) => b.lots - a.lots);
  const top = Math.max(...sorted.map((r) => r.lots), 1);

  return (
    <Panel
      right={
        <Link to="/torgi/plates" className="text-xs text-primary hover:underline">
          Свои паттерны →
        </Link>
      }
    >
      <div className="space-y-3">
        {sorted.map((r, i) => (
          <MeterRow
            key={r.preset}
            label={r.preset}
            value={r.lots.toLocaleString("ru-RU")}
            share={r.lots / top}
            color={PALETTE[i % PALETTE.length]}
            hint={`${r.lots} лотов с номером под пресет «${r.preset}»`}
          />
        ))}
      </div>
    </Panel>
  );
}
