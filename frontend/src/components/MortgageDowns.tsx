import { Plus, X } from "lucide-react";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { moneyShort } from "@/lib/format";
import {
  DOWN_COLORS,
  MIN_DOWN_PCT,
  pctOfPrice,
  resolveDownRubs,
} from "@/lib/mortgage";
import { cn } from "@/lib/utils";

/**
 * "Мои первоначальные взносы" — the editable list that drives every mortgage
 * chart (calculator page and the apartment sheet). You enter a fixed sum in ₽
 * (your money); the % is just derived from whatever price is in play. Row 0 is
 * the current взнос from settings.
 */
export function MortgageDowns({
  price,
  className,
  compact = false,
}: {
  price: number;
  className?: string;
  compact?: boolean;
}) {
  const [c, set] = useMortgageCfg();
  const shown = resolveDownRubs(c);
  const canAdd = c.compareDowns.length < 3 && shown.length < 4;
  const hasPrice = price > 0;

  const setExtra = (i: number, rub: number) =>
    set({ compareDowns: c.compareDowns.map((x, j) => (j === i ? rub : x)) });

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div
        className={cn(
          "mb-3 gap-x-2",
          compact ? "flex flex-col" : "flex flex-wrap items-center justify-between",
        )}
      >
        <h2 className="text-sm font-semibold">Мои первоначальные взносы</h2>
        <span className="text-xs text-muted-foreground">
          фиксированная сумма в ₽ — одна для любой квартиры
          {compact ? "" : " · на всех графиках"}
        </span>
      </div>

      <div className="space-y-2">
        <Row
          compact={compact}
          color={DOWN_COLORS[0]}
          rub={c.downRub}
          pct={hasPrice ? pctOfPrice(c.downRub, price) : null}
          tag="текущий"
          onRub={(r) => set({ downRub: r })}
        />
        {c.compareDowns.map((r, i) => (
          <Row
            key={i}
            compact={compact}
            color={DOWN_COLORS[(i + 1) % DOWN_COLORS.length]}
            rub={r}
            pct={hasPrice ? pctOfPrice(r, price) : null}
            onRub={(v) => setExtra(i, v)}
            onRemove={() =>
              set({ compareDowns: c.compareDowns.filter((_, j) => j !== i) })
            }
          />
        ))}
      </div>

      {canAdd && (
        <button
          type="button"
          onClick={() => {
            const used = new Set([c.downRub, ...c.compareDowns]);
            const step = Math.round(price * 0.05) || 500_000;
            let next = c.downRub + (Math.round(price * 0.1) || 1_000_000);
            while (used.has(next)) next += step;
            set({ compareDowns: [...c.compareDowns, next] });
          }}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus size={13} /> добавить взнос
        </button>
      )}
    </div>
  );
}

function Row({
  color,
  rub,
  pct,
  tag,
  compact,
  onRub,
  onRemove,
}: {
  color: string;
  rub: number;
  pct: number | null;
  tag?: string;
  compact?: boolean;
  onRub: (r: number) => void;
  onRemove?: () => void;
}) {
  const low = pct != null && pct < MIN_DOWN_PCT;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <NumberField
        value={rub}
        min={0}
        onChange={onRub}
        className={cn("h-9", compact ? "w-28" : "w-36")}
      />
      <span className="text-muted-foreground">₽</span>
      {pct != null && (
        <span className="tnum text-xs text-muted-foreground">
          · {pct}%{compact ? "" : ` (${moneyShort(rub)})`}
        </span>
      )}
      {tag && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {tag}
        </span>
      )}
      {low && (
        <span
          className="rounded-full bg-neg-soft px-2 py-0.5 text-xs font-medium text-neg"
          title={`Первоначальный взнос ниже ${MIN_DOWN_PCT}% от цены — банки такую ипотеку обычно не одобряют`}
        >
          недостаточно средств
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label="убрать взнос"
          onClick={onRemove}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
