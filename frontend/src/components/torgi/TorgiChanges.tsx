import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { TorgiChangeRow } from "@/hooks/useTorgiDashboard";
import { moneyShort, pct, relTime } from "@/lib/format";
import { Empty, LotRow, Panel } from "@/components/torgi/parts";
import { cn } from "@/lib/utils";

type Kind = "price_drop" | "price_rise" | "status" | "final" | "other";

const GROUPS: { kind: Kind; title: string; tone: "pos" | "neg" | "reserve" }[] = [
  { kind: "price_drop", title: "Подешевели", tone: "pos" },
  { kind: "price_rise", title: "Подорожали", tone: "neg" },
  { kind: "final", title: "Появилась итоговая цена", tone: "reserve" },
  { kind: "status", title: "Сменился статус", tone: "reserve" },
  { kind: "other", title: "Прочие правки", tone: "reserve" },
];

/** Причина правки выводится из самой строки истории — отдельного поля нет. */
function classify(c: TorgiChangeRow): Kind {
  if (
    c.start_price != null &&
    c.prev_start_price != null &&
    c.start_price !== c.prev_start_price
  )
    return c.start_price < c.prev_start_price ? "price_drop" : "price_rise";
  if (c.final_price != null) return "final";
  if (c.status_text !== c.prev_status_text) return "status";
  return "other";
}

function deltaPct(c: TorgiChangeRow): number | null {
  if (!c.prev_start_price || c.start_price == null) return null;
  return ((c.start_price - c.prev_start_price) / c.prev_start_price) * 100;
}

export function TorgiChanges({ rows }: { rows: TorgiChangeRow[] }) {
  if (rows.length === 0)
    return (
      <Panel>
        <Empty>Изменений пока не было.</Empty>
      </Panel>
    );

  const byKind = new Map<Kind, TorgiChangeRow[]>();
  for (const c of rows) {
    const k = classify(c);
    const list = byKind.get(k) ?? [];
    list.push(c);
    byKind.set(k, list);
  }

  return (
    <div className="space-y-2">
      {GROUPS.filter((g) => byKind.has(g.kind)).map((g) => (
        <Group key={g.kind} g={g} items={byKind.get(g.kind)!} />
      ))}
    </div>
  );
}

function Group({
  g,
  items,
}: {
  g: (typeof GROUPS)[number];
  items: TorgiChangeRow[];
}) {
  const [open, setOpen] = useState(false);
  const toneCls =
    g.tone === "pos" ? "text-pos" : g.tone === "neg" ? "text-neg" : "text-reserve";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/60"
      >
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
        <span className={cn("font-medium", toneCls)}>{g.title}</span>
        <span className="tnum text-xs text-muted-foreground">{items.length}</span>
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {items.map((c) => {
            const d = deltaPct(c);
            return (
              <LotRow
                key={`${c.lot_id}-${c.version ?? 0}`}
                lotId={c.lot_id}
                title={c.name}
                sub={
                  <>
                    {relTime(c.updated_at)}
                    {c.version != null ? ` · версия ${c.version}` : ""}
                    {g.kind === "status" && c.prev_status_text
                      ? ` · ${c.prev_status_text} → ${c.status_text ?? "—"}`
                      : ""}
                  </>
                }
                right={
                  g.kind === "price_drop" || g.kind === "price_rise" ? (
                    <span
                      className={cn(
                        "tnum text-xs",
                        g.kind === "price_drop" ? "text-pos" : "text-neg",
                      )}
                    >
                      {moneyShort(c.prev_start_price)} →{" "}
                      {moneyShort(c.start_price)} ₽
                      {d === null ? "" : ` · ${pct(d)}`}
                    </span>
                  ) : g.kind === "final" ? (
                    <span className="tnum text-xs text-muted-foreground">
                      итог {moneyShort(c.final_price)} ₽
                    </span>
                  ) : (
                    <span className="tnum text-xs text-muted-foreground">
                      {moneyShort(c.start_price)} ₽
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
