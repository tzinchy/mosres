import type { TorgiCategoryRow } from "@/hooks/useTorgiDashboard";
import { money } from "@/lib/format";
import { Empty, Panel } from "@/components/torgi/parts";

const COLS: {
  label: string;
  get: (r: TorgiCategoryRow) => string;
}[] = [
  { label: "Лотов", get: (r) => r.lots.toLocaleString("ru-RU") },
  { label: "В приёме", get: (r) => r.open_lots.toLocaleString("ru-RU") },
  { label: "Продано", get: (r) => r.sold_lots.toLocaleString("ru-RU") },
  { label: "Средняя начальная", get: (r) => money(r.avg_start_price) },
  { label: "Мин. начальная", get: (r) => money(r.min_start_price) },
  { label: "Средняя итоговая", get: (r) => money(r.avg_final_price) },
  { label: "Средний пробег", get: (r) => money(r.avg_mileage) },
  { label: "С номером", get: (r) => r.with_plate.toLocaleString("ru-RU") },
];

export function TorgiCategories({ rows }: { rows: TorgiCategoryRow[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Нет данных по категориям.</Empty>
      </Panel>
    );

  const sorted = [...rows].sort((a, b) => b.lots - a.lots);

  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-2 py-2 text-left font-normal">Категория</th>
              {COLS.map((c) => (
                <th key={c.label} className="px-2 py-2 text-right font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={r.category ?? "—"}>
                <td className="px-2 py-2">{r.category || "—"}</td>
                {COLS.map((c) => (
                  <td key={c.label} className="tnum px-2 py-2 text-right">
                    {c.get(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
