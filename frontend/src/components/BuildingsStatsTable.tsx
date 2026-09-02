import { useState } from "react";
import { Link } from "react-router-dom";
import { moneyShort } from "@/lib/format";
import type { BuildingStat } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "aparts"
  | "avg_price_m"
  | "with_discount"
  | "reserved"
  | "new_week"
  | "favorites_count";

const COLS: { key: SortKey; label: string; fmt?: (v: number) => string }[] = [
  { key: "aparts", label: "Квартир" },
  { key: "avg_price_m", label: "₽/м²", fmt: moneyShort },
  { key: "with_discount", label: "Скидки" },
  { key: "reserved", label: "Резерв" },
  { key: "new_week", label: "Новых/нед" },
  { key: "favorites_count", label: "★" },
];

export function BuildingsStatsTable({ rows }: { rows: BuildingStat[] }) {
  const [sort, setSort] = useState<SortKey>("with_discount");
  const sorted = [...rows].sort(
    (a, b) => (Number(b[sort]) || 0) - (Number(a[sort]) || 0),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-2.5 text-left font-medium">Дом</th>
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => setSort(c.key)}
                className={cn(
                  "cursor-pointer px-3 py-2.5 text-right font-medium hover:text-foreground",
                  sort === c.key && "text-foreground",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => (
            <tr
              key={b.building_id}
              className="border-b border-border/60 last:border-0 hover:bg-secondary/50"
            >
              <td className="px-3 py-2">
                <Link
                  to={`/buildings/${b.building_id}`}
                  className="flex items-center gap-2.5 hover:underline"
                >
                  {b.img_url ? (
                    <img
                      src={b.img_url}
                      alt=""
                      loading="lazy"
                      className="size-8 shrink-0 rounded border border-border object-cover"
                    />
                  ) : (
                    <span className="size-8 shrink-0 rounded border border-border bg-secondary" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {b.address ?? `Дом ${b.building_id}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {b.status_label}
                    </span>
                  </span>
                </Link>
              </td>
              {COLS.map((c) => {
                const v = Number(b[c.key]) || 0;
                return (
                  <td key={c.key} className="tnum px-3 py-2 text-right">
                    {c.fmt ? c.fmt(v) : v || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
