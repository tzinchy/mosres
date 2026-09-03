import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRates } from "@/hooks/useDashboard";
import { money, moneyShort } from "@/lib/format";
import {
  MORTGAGE_KEY,
  annuity,
  cfgRate,
  loadMortgageCfg,
  type MortgageCfg,
  type Program,
} from "@/lib/mortgage";
import { cn } from "@/lib/utils";

function Num({
  value,
  onChange,
  max,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  suffix: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        value={value === 0 ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
          const n = raw === "" ? 0 : Number(raw);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0);
        }}
        className="tnum h-7 w-14 rounded border border-input bg-background px-1.5 text-sm text-foreground outline-none focus:border-ring"
      />
      {suffix}
    </span>
  );
}

export function MortgageWidget({ price }: { price: number | null }) {
  const { data: rates } = useRates();
  const [c, setC] = useState<MortgageCfg>(loadMortgageCfg);
  const set = (patch: Partial<MortgageCfg>) => {
    const next = { ...c, ...patch };
    setC(next);
    localStorage.setItem(MORTGAGE_KEY, JSON.stringify(next));
  };
  useEffect(() => {
    if (rates && c.marketRate === 0) set({ marketRate: rates.market_rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  if (!price) return null;

  const rate = cfgRate(c, rates?.market_rate ?? 20);
  const down = Math.round((price * c.downPct) / 100);
  const loan = Math.max(0, price - down);
  const months = c.tableTerm * 12;
  const monthly = Math.round(annuity(loan, rate, months));
  const overpay = Math.round(monthly * months - loan);

  return (
    <div>
      <div className="mb-2 text-sm font-medium">Ипотека</div>
      <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex gap-1 text-xs">
          {(
            [
              ["family", "Семейная"],
              ["market", "Рыночная"],
              ["custom", "Своя"],
            ] as [Program, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => set({ program: k })}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                c.program === k
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            взнос
            <Num
              value={c.downPct}
              max={95}
              suffix="%"
              onChange={(n) => set({ downPct: n })}
            />
          </span>
          <span className="inline-flex items-center gap-1">
            срок
            <Num
              value={c.tableTerm}
              max={30}
              suffix="лет"
              onChange={(n) => set({ tableTerm: Math.max(1, n) })}
            />
          </span>
          {c.program === "custom" && (
            <span className="inline-flex items-center gap-1">
              ставка
              <Num
                value={c.customRate}
                max={100}
                suffix="%"
                onChange={(n) => set({ customRate: n })}
              />
            </span>
          )}
          {c.program !== "custom" && <span>ставка {rate}%</span>}
        </div>
        <div className="tnum text-lg font-semibold">
          {money(monthly)} ₽<span className="text-sm font-normal">/мес</span>
        </div>
        <div className="tnum text-xs text-muted-foreground">
          взнос {moneyShort(down)} · кредит {moneyShort(loan)} · переплата{" "}
          {moneyShort(overpay)} ₽
        </div>
        <Link
          to="/mortgage"
          className="inline-block text-xs text-primary hover:underline"
        >
          Полный расчёт по срокам →
        </Link>
      </div>
    </div>
  );
}
