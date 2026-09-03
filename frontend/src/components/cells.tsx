import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { money, pct } from "@/lib/format";
import type { ApartRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** signed price delta with direction glyph; down = good (pos), up = neg */
export function PriceDelta({
  abs,
  pctVal,
  compact,
}: {
  abs: number | null;
  pctVal: number | null;
  compact?: boolean;
}) {
  if (abs === null || abs === 0)
    return <span className="text-muted-foreground">—</span>;
  const down = abs < 0;
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1 whitespace-nowrap",
        down ? "text-pos" : "text-neg",
      )}
    >
      <Icon size={13} strokeWidth={2.5} />
      {compact ? pct(pctVal) : `${money(Math.abs(abs))} · ${pct(pctVal)}`}
    </span>
  );
}

export function DiscountCell({ row }: { row: ApartRow }) {
  if (!row.has_discount) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge className="tnum border-transparent bg-pos-soft text-pos">
        {row.discount_pct ? `−${row.discount_pct}%` : "скидка"}
      </Badge>
      {row.discount_is_new && (
        <Badge className="border-transparent bg-primary/15 text-primary">
          новая
        </Badge>
      )}
    </div>
  );
}

export function FinishingBadge({
  code,
  label,
}: {
  code: string | null;
  label: string | null;
}) {
  if (!code || !label) return null;
  const tone =
    code === "FULL"
      ? "bg-pos-soft text-pos"
      : code === "STD"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return <Badge className={cn("shrink-0 border-transparent", tone)}>{label}</Badge>;
}

/** days until the purchase-application deadline (term_of_application) */
export function DeadlineBadge({ days }: { days: number | null }) {
  if (days == null) return null;
  if (days < 0)
    return (
      <Badge className="shrink-0 border-transparent bg-secondary text-muted-foreground">
        заявка закрыта
      </Badge>
    );
  const tone =
    days <= 7
      ? "bg-neg-soft text-neg font-medium"
      : days <= 14
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <Badge className={cn("tnum shrink-0 border-transparent", tone)}>
      заявка: {days} дн
    </Badge>
  );
}

export function ReserveTag({ reserve }: { reserve: number | null }) {
  if (reserve !== 1) return null;
  return (
    <Badge className="border-transparent bg-reserve-soft text-reserve">
      в резерве
    </Badge>
  );
}
