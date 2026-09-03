import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DeadlineBadge } from "@/components/cells";
import { Skeleton } from "@/components/ui/skeleton";
import { useAparts } from "@/hooks/useAparts";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HotAparts({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useAparts({
    deadline_max: 30,
    favorites_only: favOnly || undefined,
  });
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      [...(data ?? [])]
        .filter((r) => r.deadline_days !== null && r.deadline_days >= 0)
        .sort((a, b) => (a.deadline_days ?? 0) - (b.deadline_days ?? 0))
        .slice(0, 12),
    [data],
  );
  const soonest = rows[0]?.deadline_days;

  if (isLoading) return <Skeleton className="h-14 w-full rounded-xl" />;
  if (rows.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
        Нет квартир с заявкой в ближайшие 30 дней.
      </p>
    );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-secondary/60"
      >
        <span>
          <span className="font-medium">{rows.length}</span> квартир с заявкой в
          ближайшие 30 дней
          {soonest !== null && soonest !== undefined && (
            <span className="text-muted-foreground">
              {" "}
              · ближайшая через {soonest} дн
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
      {rows.map((r) => (
        <Link
          key={r.new_apart_id}
          to="/aparts?deadline_max=30"
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60"
        >
          <span className="min-w-0 truncate">
            {r.address}
            {r.number ? `, кв. ${r.number}` : ""}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="tnum text-xs text-muted-foreground">
              {money(r.price)} ₽
            </span>
            <DeadlineBadge days={r.deadline_days} />
          </span>
        </Link>
          ))}
        </div>
      )}
    </div>
  );
}
