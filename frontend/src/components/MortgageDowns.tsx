import { Plus, X } from "lucide-react";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { moneyShort } from "@/lib/format";
import { DOWN_COLORS, MIN_DOWN_PCT, resolveDowns } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

/**
 * "Мои первоначальные взносы" — the editable list that drives every mortgage
 * chart (calculator page and the apartment sheet). You enter the sum in ₽;
 * the % is derived from the price. Row 0 is the current взнос from settings.
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
  const shown = resolveDowns(c);
  const canAdd = c.compareDowns.length < 3 && shown.length < 4;
  const hasPrice = price > 0;

  const rubOf = (p: number) => Math.round((price * p) / 100);
  const pctOf = (rub: number) =>
    hasPrice ? Math.round((rub / price) * 1000) / 10 : 0;

  const setExtra = (i: number, p: number) =>
    set({ compareDowns: c.compareDowns.map((x, j) => (j === i ? p : x)) });

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
          сумма в ₽ · процент считается от цены{compact ? "" : " · на всех графиках"}
        </span>
      </div>

      {!hasPrice && (
        <p className="text-xs text-muted-foreground">
          Укажите цену квартиры, чтобы задать взносы суммой.
        </p>
      )}

      {hasPrice && (
        <div className="space-y-2">
          <Row
            compact={compact}
            color={DOWN_COLORS[0]}
            rub={rubOf(c.downPct)}
            pct={c.downPct}
            tag="текущий"
            onRub={(r) => set({ downPct: pctOf(r) })}
          />
          {c.compareDowns.map((p, i) => (
            <Row
              key={i}
              compact={compact}
              color={DOWN_COLORS[(i + 1) % DOWN_COLORS.length]}
              rub={rubOf(p)}
              pct={p}
              onRub={(r) => setExtra(i, pctOf(r))}
              onRemove={() =>
                set({ compareDowns: c.compareDowns.filter((_, j) => j !== i) })
              }
            />
          ))}
        </div>
      )}

      {hasPrice && canAdd && (
        <button
          type="button"
          onClick={() => {
            const used = new Set(
              [c.downPct, ...c.compareDowns].map((n) => Math.round(n)),
            );
            let next = Math.min(95, Math.round(c.downPct) + 10);
            while (used.has(next) && next < 95) next += 5;
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
  pct: number;
  tag?: string;
  compact?: boolean;
  onRub: (r: number) => void;
  onRemove?: () => void;
}) {
  const short = Math.round(pct * 10) / 10;
  const low = pct < MIN_DOWN_PCT;
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
      <span className="tnum text-xs text-muted-foreground">
        · {short}%{compact ? "" : ` (${moneyShort(rub)})`}
      </span>
      {tag && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {tag}
        </span>
      )}
      {low && (
        <span
          className="rounded-full bg-neg-soft px-2 py-0.5 text-xs font-medium text-neg"
          title={`Первоначальный взнос ниже ${MIN_DOWN_PCT}% — банки такую ипотеку обычно не одобряют`}
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
