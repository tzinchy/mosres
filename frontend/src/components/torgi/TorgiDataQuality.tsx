import type { TorgiDataQuality as Quality } from "@/hooks/useTorgiDashboard";
import { Empty, MeterRow, Panel } from "@/components/torgi/parts";

const FIELDS: { key: keyof Quality; label: string }[] = [
  { key: "plate", label: "Госномер" },
  { key: "vin", label: "VIN" },
  { key: "pts", label: "ПТС" },
  { key: "photos", label: "Фото" },
  { key: "video", label: "Видео" },
  { key: "coords", label: "Координаты" },
];

function color(share: number): string {
  if (share >= 0.8) return "var(--pos)";
  if (share >= 0.4) return "var(--chart-2)";
  return "var(--neg)";
}

export function TorgiDataQuality({ quality }: { quality: Quality }) {
  const values = FIELDS.map((f) => quality?.[f.key] ?? null);
  const max = Math.max(...values.map((v) => v ?? 0), 0);
  // бэкенд может отдать и доли 0..1, и проценты 0..100 — приводим к доле
  const toShare = (v: number) => (max > 1 ? v / 100 : v);

  if (values.every((v) => v === null))
    return (
      <Panel>
        <Empty>Нет данных о заполненности.</Empty>
      </Panel>
    );

  return (
    <Panel>
      <div className="space-y-3">
        {FIELDS.map((f, i) => {
          const raw = values[i];
          const share = raw === null ? 0 : toShare(raw);
          return (
            <MeterRow
              key={f.key}
              label={f.label}
              value={
                raw === null
                  ? "—"
                  : `${(share * 100).toLocaleString("ru-RU", {
                      maximumFractionDigits: 1,
                    })}%`
              }
              share={share}
              color={color(share)}
              hint={`Доля лотов, у которых заполнено поле «${f.label}»`}
            />
          );
        })}
      </div>
    </Panel>
  );
}
