import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardChanges } from "@/hooks/useDashboard";
import { moneyShort, pct, shortDate } from "@/lib/format";
import type { ChangeKind, DashboardChange } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUPS: {
  kind: ChangeKind;
  title: string;
  tone: "pos" | "neg" | "reserve";
  to: string;
}[] = [
  { kind: "price_drop", title: "Подешевели", tone: "pos", to: "/aparts?price_drop_only=1" },
  { kind: "price_rise", title: "Подорожали", tone: "neg", to: "/aparts" },
  { kind: "discount_new", title: "Появилась скидка", tone: "pos", to: "/aparts?discount_only=1" },
  { kind: "discount_gone", title: "Снята скидка", tone: "neg", to: "/aparts" },
  { kind: "family_on", title: "Стали по семейной ипотеке", tone: "pos", to: "/aparts?family_only=1" },
  { kind: "family_off", title: "Перестали по семейной ипотеке", tone: "neg", to: "/aparts" },
  { kind: "reserved", title: "Ушли в резерв", tone: "reserve", to: "/aparts?reserved_only=1" },
  { kind: "unreserved", title: "Вышли из резерва", tone: "pos", to: "/aparts?available_only=1" },
];

function priceLine(c: DashboardChange): string | null {
  if (c.kind !== "price_drop" && c.kind !== "price_rise") return null;
  return `${moneyShort(c.prev_price)} → ${moneyShort(c.next_price)} ₽ · ${pct(c.pct)}`;
}

export function DashboardChanges({
  date,
  favOnly,
}: {
  date: string;
  favOnly: boolean;
}) {
  const { data, isLoading } = useDashboardChanges(date, favOnly);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!data) return null;

  if (data.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
        За {shortDate(date)} изменений не было.
      </p>
    );

  const byKind = new Map<ChangeKind, DashboardChange[]>();
  for (const c of data) {
    const list = byKind.get(c.kind) ?? [];
    list.push(c);
    byKind.set(c.kind, list);
  }

  return (
    <div className="space-y-5">
      {GROUPS.filter((g) => byKind.has(g.kind)).map((g) => {
        const items = byKind.get(g.kind)!;
        return (
          <div key={g.kind}>
            <div className="mb-2 flex items-baseline gap-2 text-sm font-medium">
              <span
                className={cn(
                  g.tone === "pos" && "text-pos",
                  g.tone === "neg" && "text-neg",
                  g.tone === "reserve" && "text-reserve",
                )}
              >
                {g.title}
              </span>
              <span className="tnum text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {items.map((c) => {
                const line = priceLine(c);
                return (
                  <Link
                    key={`${c.new_apart_id}-${c.kind}`}
                    to={g.to}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60"
                  >
                    <span className="min-w-0 truncate">
                      {c.address}
                      {c.number ? `, кв. ${c.number}` : ""}
                    </span>
                    {line && (
                      <span
                        className={cn(
                          "tnum shrink-0 text-xs",
                          g.tone === "pos" ? "text-pos" : "text-neg",
                        )}
                      >
                        {line}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
