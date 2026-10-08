import { Empty, MeterRow, Panel } from "@/components/torgi/parts";
import type { TorgiObjectDataQuality as Quality } from "@/lib/types";

/** of — поле, где в знаменателе только типы объектов, у которых оно бывает */
const FIELDS: {
  key: keyof Quality;
  label: string;
  of?: keyof Quality;
  hint?: string;
}[] = [
  { key: "address", label: "Адрес" },
  { key: "area", label: "Площадь" },
  { key: "rooms", label: "Комнат", of: "rooms_of" },
  { key: "cadastral", label: "Кадастровый номер", of: "cadastral_of" },
  { key: "build_year", label: "Год постройки", of: "build_year_of" },
  { key: "photos", label: "Фото" },
  { key: "coords", label: "Координаты" },
  { key: "metro", label: "Метро", of: "metro_of" },
  {
    key: "card",
    label: "Карточка портала прочитана",
    hint: "Архив дочитывается порциями: пока карточка не прочитана, часть полей лота пустая.",
  },
];

function color(share: number): string {
  if (share >= 0.8) return "var(--pos)";
  if (share >= 0.4) return "var(--chart-2)";
  return "var(--neg)";
}

export function TorgiObjectDataQuality({ quality }: { quality: Quality }) {
  const values = FIELDS.map((f) => (quality?.[f.key] as number | null) ?? null);
  const lots = (k?: keyof Quality) => (k ? ((quality?.[k] as number | null) ?? 0) : 0);
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
              label={f.of ? `${f.label} (где бывает)` : f.label}
              value={
                raw === null
                  ? "—"
                  : `${(share * 100).toLocaleString("ru-RU", {
                      maximumFractionDigits: 1,
                    })}%`
              }
              share={share}
              color={color(share)}
              hint={
                f.hint ??
                (f.of
                  ? `Среди ${lots(f.of).toLocaleString("ru-RU")} лотов тех типов, у которых портал это поле вообще заполняет (комнаты — у квартир, год постройки — у домов и помещений)`
                  : `Доля лотов, у которых заполнено поле «${f.label}»`)
              }
            />
          );
        })}
      </div>
    </Panel>
  );
}
