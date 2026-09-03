import { Plus, X } from "lucide-react";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { moneyShort } from "@/lib/format";
import { DOWN_COLORS, resolveDowns } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

/**
 * "Мои первоначальные взносы" — the editable list that drives every mortgage
 * chart (calculator page and the apartment sheet). Row 0 is the current
 * взнос from settings; the rest are saved comparison shares.
 */
export function MortgageDowns({
  price,
  className,
  compact = false,
}: {
  price: number;
  className?: string;
  /** narrow container (apartment sheet) — drop the ₽ column, keep % */
  compact?: boolean;
}) {
  const [c, set] = useMortgageCfg();
  const shown = resolveDowns(c); // current + extras, capped at 4
  const canAdd = c.compareDowns.length < 3 && shown.length < 4;

  const rubOf = (p: number) => Math.round((price * p) / 100);
  const pctOf = (rub: number) => (price > 0 ? (rub / price) * 100 : 0);

  const setExtra = (i: number, p: number) =>
    set({ compareDowns: c.compareDowns.map((x, j) => (j === i ? p : x)) });

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 gap-x-2",
          compact
            ? "flex flex-col"
            : "flex flex-wrap items-center justify-between",
        )}
      >
        <h2 className="text-sm font-semibold">Мои первоначальные взносы</h2>
        <span className="text-xs text-muted-foreground">
          на всех графиках{compact ? " и в расчёте выше" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {/* текущий — правит взнос в настройках */}
        <Row
          compact={compact}
          color={DOWN_COLORS[0]}
          pct={Math.round(c.downPct * 10) / 10}
          rub={rubOf(c.downPct)}
          tag="текущий"
          onPct={(p) => set({ downPct: p })}
          onRub={(r) => set({ downPct: Math.round(pctOf(r) * 10) / 10 })}
        />

        {c.compareDowns.map((p, i) => (
          <Row
            key={i}
            compact={compact}
            color={DOWN_COLORS[(i + 1) % DOWN_COLORS.length]}
            pct={p}
            rub={rubOf(p)}
            onPct={(v) => setExtra(i, v)}
            onRub={(r) => setExtra(i, Math.round(pctOf(r) * 10) / 10)}
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
      {price <= 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Укажите цену квартиры, чтобы увидеть суммы.
        </p>
      )}
    </div>
  );
}

function Row({
  color,
  pct,
  rub,
  tag,
  compact,
  onPct,
  onRub,
  onRemove,
}: {
  color: string;
  pct: number;
  rub: number;
  tag?: string;
  compact?: boolean;
  onPct: (p: number) => void;
  onRub: (r: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <NumberField
        value={pct}
        min={0}
        max={95}
        onChange={onPct}
        className="h-9 w-16"
      />
      <span className="text-muted-foreground">%</span>
      {!compact && (
        <>
          <span className="text-muted-foreground">=</span>
          <NumberField
            value={rub}
            min={0}
            onChange={onRub}
            className="h-9 w-32"
          />
          <span className="text-muted-foreground">₽</span>
        </>
      )}
      <span className="tnum text-xs text-muted-foreground">
        {compact ? "" : "("}
        {moneyShort(rub)}
        {compact ? "" : ")"}
      </span>
      {tag && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {tag}
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
